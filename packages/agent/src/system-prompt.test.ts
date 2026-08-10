import { describe, expect, test } from "bun:test";
import { Mode } from "shared";
import { buildSystemPrompt } from "./system-prompt.js";

describe("system prompt tools", () => {
  test("PLAN advertises only read tools", () => {
    const prompt = buildSystemPrompt(Mode.PLAN);
    expect(prompt).not.toContain("**bash**");
    expect(prompt).not.toContain("**writeFile**");
    expect(prompt).not.toContain("**editFile**");
  });

  test("BUILD advertises all tools", () => {
    const prompt = buildSystemPrompt(Mode.BUILD);
    expect(prompt).toContain("**bash**");
    expect(prompt).toContain("**writeFile**");
    expect(prompt).toContain("**editFile**");
  });
});
