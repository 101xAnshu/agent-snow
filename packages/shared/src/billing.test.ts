import { describe, expect, test } from "bun:test";
import type { LanguageModelUsage } from "ai";
import { calculateCredits, estimateCostUsd } from "./billing.js";

function usage(
  inputTokens: number,
  outputTokens: number,
): LanguageModelUsage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputTokenDetails: {
      noCacheTokens: inputTokens,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokenDetails: { textTokens: outputTokens, reasoningTokens: 0 },
  };
}

describe("credit calculation", () => {
  test("uses AI SDK input token fields", () => {
    expect(calculateCredits("claude-opus-4-6", usage(1_000_000, 0))).toBe(
      1500,
    );
  });

  test("returns zero for zero usage", () => {
    expect(calculateCredits("claude-opus-4-6", usage(0, 0))).toBe(0);
  });

  test("includes output token cost", () => {
    expect(estimateCostUsd("gpt-4.1", usage(0, 1_000_000))).toBe(8);
  });
});
