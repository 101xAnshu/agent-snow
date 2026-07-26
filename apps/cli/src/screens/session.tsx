import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useLocation } from "react-router";
import { useKeyboard } from "@opentui/react";
import { z } from "zod";
import { api } from "../lib/api-client.js";
import { useChat } from "../hooks/use-chat.js";
import { usePromptConfig } from "../providers/prompt-config/index.js";
import { useKeyboardLayer } from "../providers/keyboard-layer/index.js";
import { SessionShell } from "../components/session-shell.js";
import {
  UserMessage,
  BotMessage,
  ErrorMessage,
} from "../components/messages/index.js";

const locationStateSchema = z.object({
  initialMessage: z.string().optional(),
  mode: z.string().optional(),
  model: z.string().optional(),
});

export function Session() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { mode, model } = usePromptConfig();
  const { isTopLayer } = useKeyboardLayer();
  const [initialLoading, setInitialLoading] = useState(true);
  const [dbMessages, setDbMessages] = useState<Array<
    Record<string, unknown>
  > | null>(null);

  const parsedState = locationStateSchema.safeParse(location.state);
  const state = parsedState.success ? parsedState.data : {};

  useEffect(() => {
    if (!id) return;
    api
      .getSession(id)
      .then((res) => {
        const session = res.session as {
          messages?: Array<Record<string, unknown>>;
        };
        setDbMessages(session.messages ?? []);
        setInitialLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load session:", err);
        setInitialLoading(false);
      });
  }, [id]);

  const initialMessages = useMemo(() => dbMessages ?? undefined, [dbMessages]);
  const chat = useChat({ sessionId: id ?? "", initialMessages });

  useEffect(() => {
    return () => {
      void chat.abort();
    };
  }, [chat.abort]);

  useEffect(() => {
    if (state.initialMessage && chat.messages.length === 0) {
      chat.submit({ userText: state.initialMessage, mode, model });
    }
  }, [state.initialMessage, mode, model, chat]);

  const handleSubmit = useCallback(
    (text: string) => chat.submit({ userText: text, mode, model }),
    [chat, mode, model],
  );

  // Handle escape key to interrupt streaming
  useKeyboard((key) => {
    if (
      key.name === "escape" &&
      isTopLayer("base") &&
      chat.status === "streaming"
    ) {
      key.preventDefault();
      chat.interrupt();
    }
  });

  if (initialLoading) {
    return (
      <SessionShell
        onSubmit={handleSubmit}
        inputDisabled
        loading
      >
        <text>Loading session...</text>
      </SessionShell>
    );
  }

  return (
    <SessionShell
      onSubmit={handleSubmit}
      loading={chat.status === "submitted" || chat.status === "streaming"}
      interruptible={chat.status === "submitted" || chat.status === "streaming"}
    >
      {chat.messages.map((msg) => {
        const meta = msg.metadata as
          { mode?: "PLAN" | "BUILD"; model?: string; durationMs?: number } | undefined;
        if (msg.role === "user")
          return (
            <UserMessage
              key={msg.id}
              parts={msg.parts ?? []}
              mode={meta?.mode ?? mode}
            />
          );
        if (msg.role === "assistant")
          return (
            <BotMessage
              key={msg.id}
              parts={msg.parts ?? []}
              mode={meta?.mode ?? mode}
              model={meta?.model ?? model}
              durationMs={meta?.durationMs}
            />
          );
        return null;
      })}
      {chat.error && <ErrorMessage error={chat.error.message} />}
    </SessionShell>
  );
}
