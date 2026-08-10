import type { LanguageModelUsage } from "ai";
import { findSupportedChatModel } from "./models.js";
import type { ModelPricing } from "./models.js";

export function estimateCostUsd(
  modelId: string,
  usage: LanguageModelUsage,
): number {
  const model = findSupportedChatModel(modelId);
  if (!model) throw new Error(`Unknown model for billing: ${modelId}`);

  const inputTokens = usage.inputTokens ?? 0;
  const outputTokens = usage.outputTokens ?? 0;
  const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
  const cacheWriteTokens = usage.inputTokenDetails?.cacheWriteTokens ?? 0;
  const uncachedInputTokens = Math.max(
    0,
    inputTokens - cacheReadTokens - cacheWriteTokens,
  );
  const pricing: ModelPricing = model.pricing;

  return (
    (uncachedInputTokens / 1_000_000) * pricing.inputUsdPerMillionTokens +
    (outputTokens / 1_000_000) * pricing.outputUsdPerMillionTokens +
    (cacheReadTokens / 1_000_000) *
      (pricing.cacheReadUsdPerMillionTokens ??
        pricing.inputUsdPerMillionTokens) +
    (cacheWriteTokens / 1_000_000) *
      (pricing.cacheWriteUsdPerMillionTokens ??
        pricing.inputUsdPerMillionTokens)
  );
}

export function convertUsdToCredits(usd: number): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd / 0.01));
}

export function calculateCredits(
  modelId: string,
  usage: LanguageModelUsage,
): number {
  return convertUsdToCredits(estimateCostUsd(modelId, usage));
}
