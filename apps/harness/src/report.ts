import type { EvalReport, EvalRunResult } from "./types.js";

export function formatConsoleReport(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`Eval report — model: ${report.model}`);
  lines.push(`Started: ${report.startedAt}`);
  lines.push("");
  lines.push("ID                     STATUS   STEPS   TOKENS     WALL(ms)  DETAIL");
  for (const result of report.results) {
    lines.push(formatResultRow(result));
  }
  lines.push("");
  lines.push(
    `${report.summary.total} tasks | ${report.summary.passed} passed | ` +
      `${report.summary.failed} failed | ${report.summary.errors} errors | ` +
      `${report.summary.totalTokens} tokens | ${report.summary.totalWallMs}ms`,
  );
  return lines.join("\n");
}

function formatResultRow(result: EvalRunResult): string {
  const id = result.task.id.padEnd(21).slice(0, 21);
  const status = result.status.padEnd(7).slice(0, 7);
  const steps = String(result.steps).padEnd(5).slice(0, 5);
  const tokens = String(result.usage.totalTokens).padEnd(7).slice(0, 7);
  const wall = String(result.wallMs).padEnd(9).slice(0, 9);
  const detail =
    result.status === "error"
      ? result.error ?? "unknown error"
      : result.status === "fail"
        ? `check exit ${result.checkExitCode}`
        : "";
  return `${id} ${status} ${steps}   ${tokens}  ${wall}  ${detail}`;
}

export function formatMarkdownReport(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# Eval report — ${report.model}`);
  lines.push("");
  lines.push(`Started: ${report.startedAt}`);
  lines.push("");
  lines.push("| ID | Status | Steps | Tokens | Wall (ms) | Detail |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const result of report.results) {
    const detail =
      result.status === "error"
        ? result.error ?? ""
        : result.status === "fail"
          ? `check exit ${result.checkExitCode}`
          : "";
    lines.push(
      `| ${result.task.id} | ${result.status} | ${result.steps} | ` +
        `${result.usage.totalTokens} | ${result.wallMs} | ${detail} |`,
    );
  }
  lines.push("");
  lines.push(
    `**Summary:** ${report.summary.passed}/${report.summary.total} passed ` +
      `(${report.summary.failed} failed, ${report.summary.errors} errors), ` +
      `${report.summary.totalTokens} tokens, ${report.summary.totalWallMs}ms`,
  );
  return lines.join("\n");
}
