import { findSupportedChatModel } from "shared";

export function estimateCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const model = findSupportedChatModel(modelId);
  if (!model) throw new Error(`Unknown model for billing: ${modelId}`);

  return (
    (inputTokens / 1_000_000) * model.pricing.inputUsdPerMillionTokens +
    (outputTokens / 1_000_000) * model.pricing.outputUsdPerMillionTokens
  );
}

export function convertUsdToCredits(usd: number): number {
  if (usd <= 0) return 0;
  return Math.max(1, Math.ceil(usd / 0.01));
}

export function calculateCredits(
  modelId: string,
  usage: { promptTokens?: number; completionTokens?: number }
): number {
  return convertUsdToCredits(estimateCostUsd(modelId, usage.promptTokens ?? 0, usage.completionTokens ?? 0));
}
