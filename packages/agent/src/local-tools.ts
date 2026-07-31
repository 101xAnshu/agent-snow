import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { toolInputSchemas, Mode } from "shared";
import type { ModeType } from "shared";
import { z } from "zod";

// ── Path safety ────────────────────────────────────────────────

function resolveInsideCwd(cwd: string, inputPath: string): string {
  const resolved = resolve(cwd, inputPath);
  if (resolved !== cwd && !resolved.startsWith(cwd + sep))
    throw new Error(`Path traversal detected: ${inputPath}`);
  return resolved;
}

// ── Concurrency limit (max 5) ──────────────────────────────────

const MAX_CONCURRENCY = 5;
let activeCount = 0;
const queue: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (activeCount < MAX_CONCURRENCY) {
    activeCount++;
    return;
  }
  await new Promise<void>((r) => queue.push(r));
}

function release(): void {
  const next = queue.shift();
  if (next) next();
  else activeCount--;
}

// ── Timeout wrapper ────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms?: number): Promise<T> {
  if (!ms) return promise;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// ── Tool implementations ───────────────────────────────────────

async function readFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.readFile>,
) {
  const filePath = resolveInsideCwd(cwd, args.filePath);
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  if (args.offset !== undefined || args.limit !== undefined) {
    return lines
      .slice(
        (args.offset ?? 1) - 1,
        (args.offset ?? 1) - 1 + (args.limit ?? lines.length),
      )
      .join("\n");
  }
  return content;
}

async function listDirTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.listDirectory>,
) {
  const dirPath = resolveInsideCwd(cwd, args.path);
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .join("\n");
}

async function globTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.glob>,
) {
  const searchPath = args.path ? resolveInsideCwd(cwd, args.path) : cwd;
  const results: string[] = [];
  for await (const match of new Bun.Glob(args.pattern).scan({
    cwd: searchPath,
    absolute: true,
  })) {
    results.push(match);
  }
  return results.join("\n");
}

async function grepTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.grep>,
) {
  const searchPath = args.path ? resolveInsideCwd(cwd, args.path) : cwd;
  const pattern = new RegExp(args.pattern);
  const include = args.include ? new Bun.Glob(args.include) : null;
  const results: string[] = [];
  let count = 0;

  async function searchDir(dir: string): Promise<void> {
    if (count >= 100) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (count >= 100) break;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await searchDir(fullPath);
      } else if (entry.isFile()) {
        if (include && !include.match(entry.name)) continue;
        try {
          const lines = (await readFile(fullPath, "utf-8")).split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (pattern.test(lines[i]!)) {
              results.push(
                `${fullPath}:${i + 1}:${lines[i]?.trim().slice(0, 200)}`,
              );
              count++;
              if (count >= 100) break;
            }
          }
        } catch {
          /* Ignore */
        }
      }
    }
  }

  await searchDir(searchPath);
  return results.join("\n");
}

async function writeFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.writeFile>,
) {
  const filePath = resolveInsideCwd(cwd, args.filePath);
  await writeFile(filePath, args.content, "utf-8");
  return `Written ${Buffer.byteLength(args.content, "utf-8")} bytes to ${filePath}`;
}

async function editFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.editFile>,
) {
  const filePath = resolveInsideCwd(cwd, args.filePath);
  const content = await readFile(filePath, "utf-8");
  const idx = content.indexOf(args.oldString);
  if (idx === -1) throw new Error(`Could not find oldString in ${filePath}`);
  if (content.indexOf(args.oldString, idx + 1) !== -1)
    throw new Error(`Found multiple occurrences — be more specific`);
  await writeFile(
    filePath,
    content.replace(args.oldString, args.newString),
    "utf-8",
  );
  return `Edited ${filePath}`;
}

async function bashTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.bash>,
) {
  const isWin = process.platform === "win32";
  const shell = isWin ? ["cmd.exe", "/c"] : ["bash", "-c"];
  const proc = Bun.spawn([...shell, args.command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const timeout = args.timeout ?? 30_000;

  const output = await withTimeout(
    (async () => {
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;
      if (exitCode === 0) return stdout || "(no output)";
      throw new Error(`Exit code ${exitCode}:\n${stderr || stdout}`);
    })(),
    timeout,
  );

  return output;
}

// ── Dispatcher ─────────────────────────────────────────────────

const toolImpl: Record<
  string,
  (cwd: string, args: unknown) => Promise<string>
> = {
  readFile: (cwd, a) =>
    readFileTool(cwd, a as z.infer<typeof toolInputSchemas.readFile>),
  listDirectory: (cwd, a) =>
    listDirTool(cwd, a as z.infer<typeof toolInputSchemas.listDirectory>),
  glob: (cwd, a) => globTool(cwd, a as z.infer<typeof toolInputSchemas.glob>),
  grep: (cwd, a) => grepTool(cwd, a as z.infer<typeof toolInputSchemas.grep>),
  writeFile: (cwd, a) =>
    writeFileTool(cwd, a as z.infer<typeof toolInputSchemas.writeFile>),
  editFile: (cwd, a) =>
    editFileTool(cwd, a as z.infer<typeof toolInputSchemas.editFile>),
  bash: (cwd, a) => bashTool(cwd, a as z.infer<typeof toolInputSchemas.bash>),
};

const READ_ONLY_TOOLS = ["readFile", "listDirectory", "glob", "grep"];

export async function executeLocalTool(
  toolName: string,
  args: unknown,
  mode: ModeType,
  cwd: string = process.cwd(),
): Promise<string> {
  if (mode === Mode.PLAN && !READ_ONLY_TOOLS.includes(toolName)) {
    throw new Error(`Tool "${toolName}" is not available in PLAN mode`);
  }
  const impl = toolImpl[toolName];
  if (!impl) throw new Error(`Unknown tool: ${toolName}`);
  await acquire();
  try {
    return await impl(cwd, args);
  } finally {
    release();
  }
}
