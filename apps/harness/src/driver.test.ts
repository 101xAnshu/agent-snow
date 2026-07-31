import { describe, expect, test } from "bun:test";
import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { findBashBinary } from "agent";
import { buildSandbox, runCheck } from "./driver.js";
import type { EvalTask } from "./types.js";

const hasBash = await findBashBinary().then((b) => b !== null);

describe("buildSandbox", () => {
  test("creates a directory with setup files", async () => {
    const task: EvalTask = {
      id: "t1",
      category: "test",
      description: "",
      prompt: "",
      setup: {
        "src/index.ts": "export const x = 1;\n",
        "data/config.json": '{"name":"snow"}',
      },
      check: { script: "true" },
    };
    const sandbox = await buildSandbox(task);
    try {
      expect(await readFile(join(sandbox, "src", "index.ts"), "utf-8")).toBe("export const x = 1;\n");
      expect(await readFile(join(sandbox, "data", "config.json"), "utf-8")).toBe('{"name":"snow"}');
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test("creates isolated directories per call", async () => {
    const task: EvalTask = {
      id: "t2",
      category: "test",
      description: "",
      prompt: "",
      setup: { "a.txt": "a" },
      check: { script: "true" },
    };
    const first = await buildSandbox(task);
    const second = await buildSandbox(task);
    try {
      expect(first).not.toBe(second);
      expect(await readdir(first)).toContain("a.txt");
      expect(await readdir(second)).toContain("a.txt");
    } finally {
      await rm(first, { recursive: true, force: true });
      await rm(second, { recursive: true, force: true });
    }
  });
});

describe("runCheck", () => {
  test.skipIf(!hasBash)("passes when the script exits 0", async () => {
    const task: EvalTask = {
      id: "t3",
      category: "test",
      description: "",
      prompt: "",
      check: { script: "echo done" },
    };
    const sandbox = await buildSandbox(task);
    try {
      const outcome = await runCheck(task, sandbox);
      expect(outcome.passed).toBe(true);
      expect(outcome.exitCode).toBe(0);
      expect(outcome.output).toContain("done");
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test.skipIf(!hasBash)("fails when the script exits nonzero", async () => {
    const task: EvalTask = {
      id: "t4",
      category: "test",
      description: "",
      prompt: "",
      check: { script: "echo nope; exit 3" },
    };
    const sandbox = await buildSandbox(task);
    try {
      const outcome = await runCheck(task, sandbox);
      expect(outcome.passed).toBe(false);
      expect(outcome.exitCode).toBe(3);
      expect(outcome.output).toContain("nope");
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test.skipIf(!hasBash)("passes with custom expected exit code", async () => {
    const task: EvalTask = {
      id: "t5",
      category: "test",
      description: "",
      prompt: "",
      check: { script: "exit 7", expectedExitCode: 7 },
    };
    const sandbox = await buildSandbox(task);
    try {
      const outcome = await runCheck(task, sandbox);
      expect(outcome.passed).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test.skipIf(!hasBash)("fails when expected output is missing", async () => {
    const task: EvalTask = {
      id: "t6",
      category: "test",
      description: "",
      prompt: "",
      check: { script: "echo wrong", expectedOutputContains: ["magic"] },
    };
    const sandbox = await buildSandbox(task);
    try {
      const outcome = await runCheck(task, sandbox);
      expect(outcome.passed).toBe(false);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });

  test.skipIf(!hasBash)("sees files written in the sandbox", async () => {
    const task: EvalTask = {
      id: "t7",
      category: "test",
      description: "",
      prompt: "",
      setup: { "answer.txt": "42" },
      check: { script: 'test "$(cat answer.txt)" = "42"' },
    };
    const sandbox = await buildSandbox(task);
    try {
      const outcome = await runCheck(task, sandbox);
      expect(outcome.passed).toBe(true);
    } finally {
      await rm(sandbox, { recursive: true, force: true });
    }
  });
});
