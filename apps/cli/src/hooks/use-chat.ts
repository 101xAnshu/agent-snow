import { useMemo, useRef } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { loadAuth } from "../lib/auth.js";
import { executeLocalTool } from "agent";
import { Mode, modeSchema } from "shared";
import type { ModeType, SupportedChatModelId } from "shared";
import { useDialog } from "../providers/dialog/index.js";

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
    const command = typeof input.command === "string" ? input.command : "";
    const destructive = /(^|[;&|]\s*)(rm|rmdir|del|remove-item)\b|git\s+(reset|clean)\b/i.test(command);
    const target = input.filePath ?? input.command ?? JSON.stringify(input);
    const key = `${toolName}:${String(target)}`;
    if (!destructive && approvedOperations.current.has(key)) return true;
    const approved = await confirm(`Approve ${toolName}`, `${toolName}: ${String(target)}`);
    if (approved && !destructive) approvedOperations.current.add(key);
    return approved;
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
            { mode?: string; model?: string } | undefined;
          return {
            body: {
              id: sessionId,
              messages,
              mode: modeSchema.safeParse(meta?.mode).success ? meta?.mode : Mode.PLAN,
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
      const parsedMode = modeSchema.safeParse(meta?.mode);
      const mode = parsedMode.success ? parsedMode.data : Mode.PLAN;
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
    }: {
      userText: string;
      mode: ModeType;
      model: SupportedChatModelId;
    }) => {
      chat.sendMessage({ text: userText, metadata: { mode, model } });
    },
    abort: chat.stop,
    interrupt: chat.stop,
  };
}
