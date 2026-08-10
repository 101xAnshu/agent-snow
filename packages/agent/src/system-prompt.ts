import { Mode, getToolContracts, toolInputSchemas } from "shared";
import type { ModeType } from "shared";

const BASE_INSTRUCTIONS = `You are AgentSnow, a terminal-based AI coding agent.

You help users plan, build, and debug projects directly from the command line.

## Guidelines
- Be concise and direct. Output only what's needed.
- When reading files, read enough context to understand the code.
- When writing code, follow the project's existing conventions.
- When executing commands, prefer safe, readable commands.`;

function describeTools(mode: ModeType): string {
  return Object.entries(getToolContracts(mode))
    .map(([name, contract]) => {
      const desc = contract.description ?? "No description";
      const fields = Object.keys(toolInputSchemas[name as keyof typeof toolInputSchemas].shape).join(", ");
      return `  - **${name}**: ${desc} (parameters: ${fields})`;
    })
    .join("\n");
}

export function buildSystemPrompt(mode: ModeType): string {
  const modeInstructions =
    mode === Mode.PLAN
      ? `## Mode: PLAN (Read-Only)
You are in analysis mode. You can only read files and search the codebase.`
      : `## Mode: BUILD (Full Access)
You have full access to read, write, edit files, and execute shell commands.
Available tools: ${Object.keys(getToolContracts(mode)).join(", ")}`;

  return `${BASE_INSTRUCTIONS}\n\n${modeInstructions}\n\n## Tools\n${describeTools(mode)}`;
}
