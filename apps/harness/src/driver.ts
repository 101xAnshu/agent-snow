import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { runAgent, findBashBinary } from "agent";
import { Mode } from "shared";
import type { ModeType } from "shared";
import { toTokenUsage } from "./types.js";
import type { EvalRunResult, EvalTask } from "./types.js";

export async function buildSandbox(task: EvalTask): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), `snow-eval-${task.id}-`));
  for (const [filePath, content] of Object.entries(task.setup ?? {})) {
    const target = join(sandbox, filePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }
  return sandbox;
}

export type CheckOutcome = {
  passed: boolean;
  exitCode: number;
  output: string;
};

export async function runCheck(
  task: EvalTask,
  sandbox: string,
): Promise<CheckOutcome> {
  const scriptPath = join(sandbox, ".check.sh");
  await writeFile(scriptPath, task.check.script, "utf-8");
  const bash = await findBashBinary();
  if (!bash) throw new Error(`No bash binary found to run check for ${task.id}`);
  const proc = Bun.spawn([bash, scriptPath], {
    cwd: sandbox,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const output = stderr ? `${stdout}\n[stderr]\n${stderr}` : stdout;
  const expectedExitCode = task.check.expectedExitCode ?? 0;
  const expected = task.check.expectedOutputContains ?? [];
  const passed = exitCode === expectedExitCode && expected.every((s) => output.includes(s));
  return { passed, exitCode, output };
}

export type RunTaskOptions = {
  mode?: ModeType;
  signal?: AbortSignal;
  onEvent?: Parameters<typeof runAgent>[0]["onEvent"];
};

export async function runEvalTask(
  task: EvalTask,
  model: string,
  options: RunTaskOptions = {},
): Promise<EvalRunResult> {
  const started = performance.now();
  const sandbox = await buildSandbox(task);
  const { mode: defaultMode = Mode.BUILD, signal, onEvent } = options;
  const mode = task.mode ?? defaultMode;

  let status: EvalRunResult["status"] = "error";
  let steps = 0;
  let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let checkExitCode = -1;
  let checkOutput = "";
  let error: string | undefined;

  try {
    const result = await runAgent({
      prompt: task.prompt,
      model,
      mode,
      cwd: sandbox,
      maxSteps: task.maxSteps ?? 10,
      abortSignal: signal,
      onEvent,
    });
    steps = result.steps;
    usage = toTokenUsage(result.usage);

    const check = await runCheck(task, sandbox);
    checkExitCode = check.exitCode;
    checkOutput = check.output;
    status = check.passed ? "pass" : "fail";
  } catch (e) {
    if (signal?.aborted) {
      error = "Aborted by timeout";
    } else {
      error = e instanceof Error ? e.message : String(e);
    }
    status = "error";
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }

  return {
    task,
    status,
    steps,
    usage,
    wallMs: Math.round(performance.now() - started),
    checkExitCode,
    checkOutput,
    error,
  };
}
