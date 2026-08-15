import { useMemo, useRef } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { loadAuth } from "../lib/auth.js";
import { executeLocalTool } from "agent";
import type { ModeType, SupportedChatModelId, ThinkingLevel } from "shared";
import { useDialog } from "../providers/dialog/index.js";
import { resolveApproval, resolveModeFromMetadata } from "../lib/approval.js";

type UseChatProps = {
  sessionId: string;
  initialMessages?: Array<Record<string, unknown>>;
};

export function useChat({ sessionId, initialMessages }: UseChatProps) {
  const { confirm } = useDialog();
  const approvedOperations = useRef(new Set<string>());
  const requestApproval = async ({
    toolName,
    input,
  }: {
    toolName: string;
    input: Record<string, unknown>;
  }) => {
    return resolveApproval({
      toolName,
      input,
      approvedOperations: approvedOperations.current,
      confirm,
    });
  };
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
            | { mode?: string; model?: string; thinkingLevel?: ThinkingLevel }
            | undefined;
          return {
            body: {
              id: sessionId,
              messages,
              mode: resolveModeFromMetadata(meta?.mode),
              model: meta?.model ?? "claude-opus-4-6",
              thinkingLevel: meta?.thinkingLevel ?? "off",
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
      const mode = resolveModeFromMetadata(meta?.mode);
      void executeLocalTool(
        toolCall.toolName,
        toolCall.input as Record<string, unknown>,
        mode as ModeType,
        process.cwd(),
        { onApprovalRequired: requestApproval },
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
      thinkingLevel,
    }: {
      userText: string;
      mode: ModeType;
      model: SupportedChatModelId;
      thinkingLevel: ThinkingLevel;
    }) => {
      chat.sendMessage({
        text: userText,
        metadata: { mode, model, thinkingLevel },
      });
    },
    abort: chat.stop,
    interrupt: chat.stop,
  };
}
