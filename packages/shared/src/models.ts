import rawModels from "./models.json";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  cacheWriteUsdPerMillionTokens?: number;
  cacheReadUsdPerMillionTokens?: number;
};

export type SupportedProvider =
  "anthropic" | "openai" | "google" | "openrouter" | "ollama";
export type ThinkingLevel = "off" | "low" | "medium" | "high";

export const modelCatalogSchema = z.array(
  z.object({
    id: z.string().min(1),
    provider: z.enum(["anthropic", "openai", "google", "openrouter", "ollama"]),
    providerModelId: z.string().min(1).optional(),
    pricing: z.object({
      inputUsdPerMillionTokens: z.number().nonnegative(),
      outputUsdPerMillionTokens: z.number().nonnegative(),
      cacheWriteUsdPerMillionTokens: z.number().nonnegative().optional(),
      cacheReadUsdPerMillionTokens: z.number().nonnegative().optional(),
    }),
    meta: z.object({
      displayName: z.string(),
      contextWindow: z.number().int().positive(),
    }),
  }),
);

export function getModelCatalogPath(): string {
  return (
    process.env.SNOW_MODELS_PATH ?? join(homedir(), ".snow", "models.json")
  );
}

export function parseModelCatalog(value: unknown) {
  return modelCatalogSchema.parse(value);
}

function loadModelCatalog() {
  const builtIn = parseModelCatalog(rawModels);
  const path = getModelCatalogPath();
  if (!existsSync(path)) return builtIn;
  const external = parseModelCatalog(JSON.parse(readFileSync(path, "utf8")));
  const models = new Map(builtIn.map((model) => [model.id, model]));
  for (const model of external) models.set(model.id, model);
  return [...models.values()];
}

export const SUPPORTED_CHAT_MODELS = loadModelCatalog();
export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = string;
export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "claude-opus-4-6";

export function findSupportedChatModel(
  id: string,
): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === id);
}

export function isSupportedChatModel(id: string): id is SupportedChatModelId {
  return findSupportedChatModel(id) !== undefined;
}
