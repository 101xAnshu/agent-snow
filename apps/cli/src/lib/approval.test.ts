import { describe, expect, test } from "bun:test";
import { Mode } from "shared";
import {
  buildApprovalKey,
  isDestructiveCommand,
  resolveApproval,
  resolveModeFromMetadata,
} from "./approval.js";

describe("mode safety", () => {
  test("missing and malformed values fail closed", () => {
    expect(resolveModeFromMetadata(undefined)).toBe(Mode.PLAN);
    expect(resolveModeFromMetadata("invalid")).toBe(Mode.PLAN);
    expect(resolveModeFromMetadata(Mode.BUILD)).toBe(Mode.BUILD);
  });
});

describe("approval policy", () => {
  test("recognizes destructive commands", () => {
    expect(isDestructiveCommand("rm -rf dist")).toBe(true);
    expect(isDestructiveCommand("git reset --hard HEAD")).toBe(true);
    expect(isDestructiveCommand("bun test")).toBe(false);
  });

  test("remembers ordinary approval but prompts for destructive commands", async () => {
    const approvedOperations = new Set<string>();
    let prompts = 0;
    const confirm = async () => {
      prompts++;
      return true;
    };
    const ordinary = { toolName: "bash", input: { command: "bun test" } };
    await resolveApproval({ ...ordinary, approvedOperations, confirm });
    await resolveApproval({ ...ordinary, approvedOperations, confirm });
    expect(prompts).toBe(1);
    expect(approvedOperations.has(buildApprovalKey(ordinary.toolName, ordinary.input))).toBe(true);

    const destructive = { toolName: "bash", input: { command: "rm -rf dist" } };
    await resolveApproval({ ...destructive, approvedOperations, confirm });
    await resolveApproval({ ...destructive, approvedOperations, confirm });
    expect(prompts).toBe(3);
  });
});
