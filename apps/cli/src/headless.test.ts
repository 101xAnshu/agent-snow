import { describe, expect, test } from "bun:test";
import { Mode } from "shared";
import { parseHeadlessArgs } from "./headless.js";

describe("headless arguments", () => {
  test("parses JSON headless mode", () => {
    expect(
      parseHeadlessArgs([
        "-p",
        "inspect files",
        "--output",
        "json",
        "--agent-mode",
        "PLAN",
        "--cwd",
        ".",
        "--max-steps",
        "4",
      ]),
    ).toEqual({
      prompt: "inspect files",
      output: "json",
      mode: Mode.PLAN,
      model: "claude-opus-4-6",
      thinkingLevel: "off",
      cwd: ".",
      maxSteps: 4,
    });
  });

  test("returns null for interactive arguments", () => {
    expect(parseHeadlessArgs([])).toBeNull();
  });
});
