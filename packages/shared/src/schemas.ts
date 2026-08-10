import { z } from "zod";
import { tool, type Tool } from "ai";

export const Mode = { PLAN: "PLAN", BUILD: "BUILD" } as const;
export const modeSchema = z.enum([Mode.PLAN, Mode.BUILD]);
export type ModeType = z.infer<typeof modeSchema>;

export const toolInputSchemas = {
  readFile: z.object({
    filePath: z.string().describe("Absolute path to the file to read"),
    offset: z.number().int().nonnegative().optional().describe("Line number to start from (1-indexed)"),
    limit: z.number().int().positive().optional().describe("Maximum number of lines to read"),
  }),
  listDirectory: z.object({
    path: z.string().describe("Directory path to list"),
  }),
  glob: z.object({
    pattern: z.string().describe("Glob pattern (e.g. **/*.ts)"),
    path: z.string().optional().describe("Working directory for the glob"),
  }),
  grep: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().optional().describe("Directory to search in"),
    include: z.string().optional().describe("File pattern to include"),
  }),
  writeFile: z.object({
    filePath: z.string().describe("Absolute path of the file to write"),
    content: z.string().describe("Full content to write to the file"),
  }),
  editFile: z.object({
    filePath: z.string().describe("Absolute path of the file to edit"),
    oldString: z.string().describe("Text to replace (must be unique)"),
    newString: z.string().describe("Replacement text"),
  }),
  bash: z.object({
    command: z.string().describe("Shell command to execute"),
    timeout: z.number().int().positive().max(3_600_000).optional().describe("Timeout in ms"),
  }),
} as const;

export type ToolName = keyof typeof toolInputSchemas;
export type ReadOnlyToolName = "readFile" | "listDirectory" | "glob" | "grep";

const readTools = {
  readFile: tool({ description: "Read a file from the local filesystem", inputSchema: toolInputSchemas.readFile }),
  listDirectory: tool({ description: "List files and directories at a given path", inputSchema: toolInputSchemas.listDirectory }),
  glob: tool({ description: "Search for files matching a glob pattern", inputSchema: toolInputSchemas.glob }),
  grep: tool({ description: "Search file contents using a regex pattern", inputSchema: toolInputSchemas.grep }),
} as const satisfies Record<string, Tool>;

const writeExecTools = {
  writeFile: tool({ description: "Write content to a file (creates or overwrites)", inputSchema: toolInputSchemas.writeFile }),
  editFile: tool({ description: "Replace text in an existing file", inputSchema: toolInputSchemas.editFile }),
  bash: tool({ description: "Execute an unconfined local shell command with the current user's operating system permissions", inputSchema: toolInputSchemas.bash }),
} as const satisfies Record<string, Tool>;

export const readOnlyToolContracts = readTools;
export const buildToolContracts = { ...readTools, ...writeExecTools } as const;
export type ToolContracts = typeof buildToolContracts;

export function getToolContracts(mode: ModeType): typeof readOnlyToolContracts | typeof buildToolContracts {
  return mode === Mode.BUILD ? buildToolContracts : readOnlyToolContracts;
}
