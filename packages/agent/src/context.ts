type UiMessage = Record<string, any>;

export function estimateMessageTokens(messages: UiMessage[]): number {
  return Math.ceil(Buffer.byteLength(JSON.stringify(messages), "utf8") / 4);
}

function textFromMessage(message: UiMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => `${message.role}: ${part.text}`)
    .join("\n");
}

export function compactMessagesForContext(
  messages: UiMessage[],
  contextWindow: number,
): { messages: UiMessage[]; estimatedTokens: number; compacted: boolean } {
  const estimatedTokens = estimateMessageTokens(messages);
  if (estimatedTokens < contextWindow * 0.75 || messages.length <= 12) {
    return { messages, estimatedTokens, compacted: false };
  }

  const recent = messages.slice(-12);
  const older = messages.slice(0, -12);
  const summaryText = older.map(textFromMessage).filter(Boolean).join("\n").slice(-20_000);
  const summary: UiMessage = {
    id: `compaction-${crypto.randomUUID()}`,
    role: "user",
    parts: [
      {
        type: "text",
        text: `Summary of earlier conversation:\n${summaryText}`,
      },
    ],
    metadata: { compacted: true },
  };
  const compactedMessages = [summary, ...recent];
  return {
    messages: compactedMessages,
    estimatedTokens: estimateMessageTokens(compactedMessages),
    compacted: true,
  };
}
