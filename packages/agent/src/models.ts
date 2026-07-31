import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import { isSupportedChatModel } from "shared";

export function resolveModel(modelId: string): { model: LanguageModel; providerOptions?: Record<string, unknown> } {
  if (!isSupportedChatModel(modelId)) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  const [provider] = modelId.split("-") as [string];

  switch (provider) {
    case "claude":
      return {
        model: anthropic(modelId),
        providerOptions: modelId.includes("opus") || modelId.includes("sonnet")
          ? { anthropic: { thinking: { type: "enabled", budgetTokens: 10_000 } } }
          : undefined,
      };
    case "gpt":
      return {
        model: openai(modelId),
        providerOptions: modelId === "gpt-4.1"
          ? { openai: { thinking: { type: "enabled", reasoningSummary: "detailed" } } }
          : undefined,
      };
    case "gemini":
      return { model: google(modelId) };
    default:
      throw new Error(`Unknown provider for model: ${modelId}`);
  }
}
