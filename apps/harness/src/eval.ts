import { writeFile } from "node:fs/promises";
import { DEFAULT_CHAT_MODEL_ID, Mode, modeSchema } from "shared";
import { listFixtures } from "./fixtures/index.js";
import { runAll } from "./runner.js";
import { formatConsoleReport, formatMarkdownReport } from "./report.js";

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1]!.startsWith("--") ? argv[++i]! : "true";
      args[key] = value;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args["list"]) {
    for (const fixture of listFixtures()) {
      console.log(`${fixture.id.padEnd(24)} ${fixture.category.padEnd(12)} ${fixture.description}`);
    }
    return;
  }

  const all = listFixtures();
  const filter = args["task"] ? args["task"].split(",").map((s) => s.trim()).filter(Boolean) : null;
  const tasks = filter
    ? all.filter((t) => filter.includes(t.id))
    : all;

  if (tasks.length === 0) {
    console.error("No tasks matched. Available:");
    for (const fixture of all) console.error(`  ${fixture.id}`);
    process.exit(2);
  }

  const model = args["model"] ?? DEFAULT_CHAT_MODEL_ID;
  const mode = args["mode"] ?? Mode.BUILD;
  const parsedMode = modeSchema.safeParse(mode);
  if (!parsedMode.success) {
    console.error(`Invalid mode: ${mode}`);
    process.exit(2);
  }
  const timeoutSec = args["timeout"] ? Number(args["timeout"]) : undefined;

  const report = await runAll(tasks, {
    model,
    mode: parsedMode.data,
    timeoutSec,
    onResult: (result, index, total) => {
      console.log(`[${index + 1}/${total}] ${result.task.id}: ${result.status}`);
    },
  });

  console.log("");
  console.log(formatConsoleReport(report));

  if (args["out"]) {
    await writeFile(args["out"], formatMarkdownReport(report), "utf-8");
    console.log(`Report written to ${args["out"]}`);
  }

  if (report.summary.failed + report.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
