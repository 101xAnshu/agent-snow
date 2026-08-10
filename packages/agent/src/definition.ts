import { getToolContracts } from "shared";
import type { ModeType } from "shared";
import { resolveModel } from "./models.js";
import { buildSystemPrompt } from "./system-prompt.js";

export function createAgentDefinition(mode: ModeType, modelId: string) {
  const { model, providerOptions } = resolveModel(modelId);
  return {
    model,
    providerOptions,
    system: buildSystemPrompt(mode),
    tools: getToolContracts(mode),
  };
}
