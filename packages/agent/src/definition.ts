import { getToolContracts } from "shared";
import type { ModeType, ThinkingLevel } from "shared";
import { resolveModel } from "./models.js";
import { buildSystemPrompt } from "./system-prompt.js";

export function createAgentDefinition(
  mode: ModeType,
  modelId: string,
  thinkingLevel: ThinkingLevel = "off",
) {
  const { model, providerOptions } = resolveModel(modelId, thinkingLevel);
  return {
    model,
    providerOptions,
    system: buildSystemPrompt(mode),
    tools: getToolContracts(mode),
  };
}
