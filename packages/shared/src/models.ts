export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  cacheWriteUsdPerMillionTokens?: number;
  cacheReadUsdPerMillionTokens?: number;
};

export type SupportedProvider = "anthropic" | "openai" | "google";

type ChatModelMeta = {
  displayName: string;
  contextWindow: number;
};

type ChatModelDefinition = {
  id: string;
  provider: SupportedProvider;
  pricing: ModelPricing;
  meta: ChatModelMeta;
};

export const SUPPORTED_CHAT_MODELS = [
  {
    id: "claude-opus-4-6",
    provider: "anthropic",
    pricing: { inputUsdPerMillionTokens: 15, outputUsdPerMillionTokens: 75 },
    meta: { displayName: "Claude Opus 4.6", contextWindow: 200_000 },
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    pricing: { inputUsdPerMillionTokens: 3, outputUsdPerMillionTokens: 15 },
    meta: { displayName: "Claude Sonnet 4.6", contextWindow: 200_000 },
  },
  {
    id: "claude-haiku-4-5",
    provider: "anthropic",
    pricing: { inputUsdPerMillionTokens: 0.8, outputUsdPerMillionTokens: 4 },
    meta: { displayName: "Claude Haiku 4.5", contextWindow: 200_000 },
  },
  {
    id: "gpt-4.1",
    provider: "openai",
    pricing: { inputUsdPerMillionTokens: 2, outputUsdPerMillionTokens: 8 },
    meta: { displayName: "GPT-4.1", contextWindow: 1_000_000 },
  },
  {
    id: "gpt-4.1-mini",
    provider: "openai",
    pricing: { inputUsdPerMillionTokens: 0.4, outputUsdPerMillionTokens: 1.6 },
    meta: { displayName: "GPT-4.1 Mini", contextWindow: 1_000_000 },
  },
  {
    id: "gpt-4.1-nano",
    provider: "openai",
    pricing: { inputUsdPerMillionTokens: 0.1, outputUsdPerMillionTokens: 0.4 },
    meta: { displayName: "GPT-4.1 Nano", contextWindow: 1_000_000 },
  },
  {
    id: "gemini-2.5-flash",
    provider: "google",
    pricing: { inputUsdPerMillionTokens: 0.15, outputUsdPerMillionTokens: 0.6 },
    meta: { displayName: "Gemini 2.5 Flash", contextWindow: 1_000_000 },
  },
  {
    id: "gemini-2.5-pro",
    provider: "google",
    pricing: { inputUsdPerMillionTokens: 1.25, outputUsdPerMillionTokens: 10 },
    meta: { displayName: "Gemini 2.5 Pro", contextWindow: 1_000_000 },
  },
] as const satisfies readonly ChatModelDefinition[];

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
export type SupportedChatModelId = SupportedChatModel["id"];
export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "claude-opus-4-6";

export function findSupportedChatModel(id: string): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find((m) => m.id === id);
}

export function isSupportedChatModel(id: string): id is SupportedChatModelId {
  return SUPPORTED_CHAT_MODELS.some((m) => m.id === id);
}
