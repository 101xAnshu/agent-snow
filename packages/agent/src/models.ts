import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { findSupportedChatModel, isSupportedChatModel } from "shared";
import type { ThinkingLevel } from "shared";

export function getApiKey(provider: string): string | undefined {
  return process.env[`${provider.toUpperCase()}_API_KEY`];
}

function thinkingOptions(provider: string, level: ThinkingLevel) {
  if (level === "off") return undefined;
  const budget = { low: 2_000, medium: 8_000, high: 16_000 }[level];
  if (provider === "anthropic") {
    return {
      anthropic: { thinking: { type: "enabled", budgetTokens: budget } },
    };
  }
  if (provider === "openai") return { openai: { reasoningEffort: level } };
  if (provider === "google") {
    return { google: { thinkingConfig: { thinkingBudget: budget } } };
  }
  return undefined;
}

export function resolveModel(
  modelId: string,
  thinkingLevel: ThinkingLevel = "off",
): { model: LanguageModel; providerOptions?: Record<string, unknown> } {
  if (!isSupportedChatModel(modelId))
    throw new Error(`Unsupported model: ${modelId}`);

  const definition = findSupportedChatModel(modelId)!;
  const providerModelId = definition.providerModelId ?? modelId;
  const providerOptions = thinkingOptions(definition.provider, thinkingLevel);

  switch (definition.provider) {
    case "anthropic":
      return { model: anthropic(providerModelId), providerOptions };
    case "openai":
      return { model: openai(providerModelId), providerOptions };
    case "google":
      return { model: google(providerModelId), providerOptions };
    case "openrouter": {
      const provider = createOpenAI({
        apiKey: getApiKey("openrouter"),
        baseURL: "https://openrouter.ai/api/v1",
        name: "openrouter",
      });
      return { model: provider(providerModelId) };
    }
    case "ollama": {
      const provider = createOpenAI({
        apiKey: getApiKey("ollama") ?? "ollama",
        baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
        name: "ollama",
      });
      return { model: provider(providerModelId) };
    }
  }
}
