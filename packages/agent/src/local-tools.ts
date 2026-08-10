import { readFile, writeFile, readdir, realpath, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { toolInputSchemas, Mode } from "shared";
import type { ModeType } from "shared";
import { z } from "zod";

// ── Path safety ────────────────────────────────────────────────

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + sep);
}

async function resolveInsideCwd(cwd: string, inputPath: string): Promise<string> {
  const canonicalCwd = await realpath(cwd);
  const resolved = resolve(cwd, inputPath);
  if (!isInside(resolve(cwd), resolved))
    throw new Error(`Path traversal detected: ${inputPath}`);
  try {
    if (!isInside(canonicalCwd, await realpath(resolved))) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    let parent = resolve(resolved, "..");
    while (true) {
      try {
        if (!isInside(canonicalCwd, await realpath(parent))) {
          throw new Error(`Path traversal detected: ${inputPath}`);
        }
        break;
      } catch (parentError) {
        if ((parentError as NodeJS.ErrnoException).code !== "ENOENT") throw parentError;
        const next = resolve(parent, "..");
        if (next === parent) throw new Error(`Path traversal detected: ${inputPath}`);
        parent = next;
      }
    }
  }
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ── Tool implementations ───────────────────────────────────────

async function readFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.readFile>,
) {
  const filePath = await resolveInsideCwd(cwd, args.filePath);
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  if (args.offset !== undefined || args.limit !== undefined) {
    return lines
      .slice(
        Math.max(0, (args.offset ?? 1) - 1),
        Math.max(0, (args.offset ?? 1) - 1) + (args.limit ?? lines.length),
      )
      .join("\n");
  }
  return content;
}

async function listDirTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.listDirectory>,
) {
  const dirPath = await resolveInsideCwd(cwd, args.path);
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries
    .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
    .join("\n");
}

async function globTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.glob>,
) {
  if (
    resolve(args.pattern) === args.pattern ||
    args.pattern.split(/[\\/]+/).includes("..")
  ) {
    throw new Error(`Path traversal detected: ${args.pattern}`);
  }
  const searchPath = args.path ? await resolveInsideCwd(cwd, args.path) : cwd;
  const results: string[] = [];
  const maxResults = 500;
  for await (const match of new Bun.Glob(args.pattern).scan({
    cwd: searchPath,
    absolute: true,
  })) {
    await resolveInsideCwd(cwd, match);
    results.push(match);
    if (results.length >= maxResults) break;
  }
  return results.join("\n") +
    (results.length >= maxResults
      ? `\n[truncated: showing first ${maxResults} matches; refine your pattern or narrow the path]`
      : "");
}

async function grepTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.grep>,
) {
  const searchPath = args.path ? await resolveInsideCwd(cwd, args.path) : cwd;
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
  return results.join("\n") +
    (count >= 100
      ? "\n[truncated: showing first 100 matches; refine your pattern or narrow the path]"
      : "");
}

async function writeFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.writeFile>,
) {
  const filePath = await resolveInsideCwd(cwd, args.filePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, args.content, "utf-8");
  return `Written ${Buffer.byteLength(args.content, "utf-8")} bytes to ${filePath}`;
}

async function editFileTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.editFile>,
) {
  const filePath = await resolveInsideCwd(cwd, args.filePath);
  const content = await readFile(filePath, "utf-8");
  const idx = content.indexOf(args.oldString);
  if (idx === -1) throw new Error(`Could not find oldString in ${filePath}`);
  if (content.indexOf(args.oldString, idx + 1) !== -1)
    throw new Error(`Found multiple occurrences — be more specific`);
  const newContent = content.replace(args.oldString, args.newString);
  await writeFile(filePath, newContent, "utf-8");
  const line = newContent.slice(0, idx + args.newString.length).split("\n").length;
  const context = newContent.split("\n").slice(Math.max(0, line - 2), line + 1).join("\n");
  return `Edited ${filePath} at line ${line}\n${context}`;
}

async function findWindowsBash(): Promise<string | null> {
  const candidates = [
    "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
    "C:\\Program Files\\Git\\bin\\bash.exe",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  const fromPath = await Bun.which("bash");
  return fromPath ?? null;
}

export async function findBashBinary(): Promise<string | null> {
  if (process.platform !== "win32") return "bash";
  return findWindowsBash();
}

function killProcessTree(pid: number) {
  if (process.platform === "win32") {
    try {
      Bun.spawnSync(["taskkill", "/pid", String(pid), "/t", "/f"], {
        stdout: "ignore",
        stderr: "ignore",
      });
    } catch {
      /* Ignore */
    }
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* Ignore */
    }
  }
}

async function bashTool(
  cwd: string,
  args: z.infer<typeof toolInputSchemas.bash>,
) {
  const isWin = process.platform === "win32";
  let argv: string[];
  if (isWin) {
    const gitBash = await findWindowsBash();
    if (gitBash) {
      argv = [gitBash, "-c", args.command];
    } else {
      argv = [
        (await Bun.which("pwsh")) ?? "powershell.exe",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `${args.command}; exit $LASTEXITCODE`,
      ];
    }
  } else {
    argv = ["bash", "-c", args.command];
  }
  const proc = Bun.spawn(argv, {
    cwd,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.end();
  const timeout = args.timeout ?? 30_000;

  const run = (async () => {
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;
    if (exitCode === 0) return stdout || "(no output)";
    throw new Error(`Exit code ${exitCode}:\n${stderr || stdout}`);
  })();

  try {
    return await withTimeout(run, timeout);
  } catch (error) {
    killProcessTree(proc.pid);
    run.catch(() => {});
    throw error;
  }
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
const MAX_OUTPUT_BYTES = 50_000;

function truncateOutput(output: string): string {
  const bytes = Buffer.byteLength(output, "utf8");
  if (bytes <= MAX_OUTPUT_BYTES) return output;
  const truncated = new TextDecoder().decode(Buffer.from(output).subarray(0, MAX_OUTPUT_BYTES));
  return `${truncated}\n[truncated: output was ${bytes} bytes; use narrower tool parameters]`;
}

export async function executeLocalTool(
  toolName: string,
  args: unknown,
  mode: ModeType,
  cwd: string = process.cwd(),
  security: ToolSecurityOptions = { trusted: true },
): Promise<string> {
  if (mode === Mode.PLAN && !READ_ONLY_TOOLS.includes(toolName)) {
    throw new Error(`Tool "${toolName}" is not available in PLAN mode`);
  }
  const impl = toolImpl[toolName];
  if (!impl) throw new Error(`Unknown tool: ${toolName}`);
  if (["writeFile", "editFile", "bash"].includes(toolName)) {
    const approved = security.trusted === true || (security.onApprovalRequired
      ? await security.onApprovalRequired({ toolName, input: args as Record<string, unknown> })
      : false);
    if (!approved) return `Permission denied for ${toolName}`;
  }
  await acquire();
  try {
    return truncateOutput(await impl(cwd, args));
  } finally {
    release();
  }
}

export type ToolApprovalRequest = {
  toolName: string;
  input: Record<string, unknown>;
};

export type ToolSecurityOptions = {
  trusted?: boolean;
  onApprovalRequired?: (request: ToolApprovalRequest) => Promise<boolean>;
};
