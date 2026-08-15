import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CHAT_MODEL_ID,
  findSupportedChatModel,
  isSupportedChatModel,
  parseModelCatalog,
} from "./models.js";

describe("model catalog", () => {
  test("includes the default and local providers", () => {
    expect(isSupportedChatModel(DEFAULT_CHAT_MODEL_ID)).toBe(true);
    expect(findSupportedChatModel("ollama:qwen2.5-coder:7b")?.provider).toBe(
      "ollama",
    );
    expect(
      findSupportedChatModel("openrouter:anthropic/claude-sonnet-4.6")
        ?.provider,
    ).toBe("openrouter");
  });

  test("rejects malformed catalog entries", () => {
    expect(() => parseModelCatalog([{ id: "broken" }])).toThrow();
  });
});
