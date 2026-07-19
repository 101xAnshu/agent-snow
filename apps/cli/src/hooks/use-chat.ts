import { useMemo } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { loadAuth } from "../lib/auth.js";
import { executeLocalTool } from "../lib/local-tools.js";
import type { ModeType, SupportedChatModelId } from "shared";

type UseChatProps = {
  sessionId: string;
  initialMessages?: Array<Record<string, unknown>>;
};

export function useChat({ sessionId, initialMessages }: UseChatProps) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${process.env.API_URL ?? "http://localhost:3000"}/chat`,
        headers: async () => {
          const auth = await loadAuth();
          return {
            "Content-Type": "application/json",
            ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
          };
        },
        prepareSendMessagesRequest({ messages }) {
          const lastMsg = messages[messages.length - 1];
          const meta = lastMsg?.metadata as
            { mode?: string; model?: string } | undefined;
          return {
            body: {
              id: sessionId,
              messages,
              mode: meta?.mode ?? "BUILD",
              model: meta?.model ?? "claude-opus-4-6",
            },
          };
        },
      }),
    [sessionId],
  );

  const chat = useAiChat({
    transport,
    messages: initialMessages as any,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }: { toolCall: any }) {
      const meta = chat.messages.at(-1)?.metadata as
        { mode?: string } | undefined;
      const mode = meta?.mode ?? "BUILD";
      void executeLocalTool(
        toolCall.toolName,
        toolCall.input as Record<string, unknown>,
        mode as ModeType,
      )
        .then((output) =>
          chat.addToolOutput({
            tool: toolCall.toolName as never,
            toolCallId: toolCall.toolCallId,
            output,
          }),
        )
        .catch((error) =>
          chat.addToolOutput({
            tool: toolCall.toolName as never,
            toolCallId: toolCall.toolCallId,
            state: "output-error" as const,
            errorText: error.message,
          }),
        );
    },
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    submit: ({
      userText,
      mode,
      model,
    }: {
      userText: string;
      mode: ModeType;
      model: SupportedChatModelId;
    }) => {
      chat.sendMessage({ text: userText, metadata: { mode, model } });
    },
    interrupt: chat.stop,
  };
}
