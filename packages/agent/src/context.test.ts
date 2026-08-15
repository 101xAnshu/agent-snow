import { describe, expect, test } from "bun:test";
import { compactMessagesForContext, estimateMessageTokens } from "./context.js";

describe("context management", () => {
  test("leaves short conversations unchanged", () => {
    const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "hello" }] }];
    expect(compactMessagesForContext(messages, 1000)).toEqual({
      messages,
      estimatedTokens: estimateMessageTokens(messages),
      compacted: false,
    });
  });

  test("compacts older turns and keeps recent messages intact", () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      id: String(index),
      role: index % 2 ? "assistant" : "user",
      parts: [{ type: "text", text: "x".repeat(1000) }],
    }));
    const result = compactMessagesForContext(messages, 1000);
    expect(result.compacted).toBe(true);
    expect(result.messages.slice(1).map((message) => message.id)).toEqual(
      messages.slice(-12).map((message) => message.id),
    );
    expect(result.estimatedTokens).toBeLessThan(estimateMessageTokens(messages));
  });
});
