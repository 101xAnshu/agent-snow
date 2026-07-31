import { runEvalTask } from "./driver.js";
import type { EvalReport, EvalRunResult, EvalSummary, EvalTask, RunAllOptions } from "./types.js";

export async function runAll(
  tasks: EvalTask[],
  options: RunAllOptions,
): Promise<EvalReport> {
  const { model, timeoutSec = 300, onResult } = options;
  const started = performance.now();
  const results: EvalRunResult[] = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (task.timeoutSec ?? timeoutSec) * 1000);
    const result = await runEvalTask(task, model, {
      mode: options.mode,
      signal: controller.signal,
    });
    clearTimeout(timer);
    results.push(result);
    onResult?.(result, i, tasks.length);
  }

  return {
    model,
    startedAt: new Date().toISOString(),
    results,
    summary: summarize(results, Math.round(performance.now() - started)),
  };
}

export function summarize(results: EvalRunResult[], totalWallMs: number): EvalSummary {
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let totalTokens = 0;
  for (const result of results) {
    if (result.status === "pass") passed++;
    else if (result.status === "fail") failed++;
    else errors++;
    totalTokens += result.usage.totalTokens;
  }
  return {
    total: results.length,
    passed,
    failed,
    errors,
    totalTokens,
    totalWallMs,
  };
}
