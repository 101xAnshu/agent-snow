import { Mode, modeSchema } from "shared";
import type { ModeType } from "shared";

export function resolveModeFromMetadata(value: unknown): ModeType {
  const parsed = modeSchema.safeParse(value);
  return parsed.success ? parsed.data : Mode.PLAN;
}

export function isDestructiveCommand(command: string): boolean {
  return /(^|[;&|]\s*)(rm|rmdir|del|remove-item)\b|git\s+(reset|clean)\b/i.test(
    command,
  );
}

export function buildApprovalKey(
  toolName: string,
  input: Record<string, unknown>,
): string {
  const target = input.filePath ?? input.command ?? JSON.stringify(input);
  return `${toolName}:${String(target)}`;
}

export async function resolveApproval({
  toolName,
  input,
  approvedOperations,
  confirm,
}: {
  toolName: string;
  input: Record<string, unknown>;
  approvedOperations: Set<string>;
  confirm: (title: string, message: string) => Promise<boolean>;
}): Promise<boolean> {
  const command = typeof input.command === "string" ? input.command : "";
  const destructive = isDestructiveCommand(command);
  const key = buildApprovalKey(toolName, input);
  if (!destructive && approvedOperations.has(key)) return true;
  const target = input.filePath ?? input.command ?? JSON.stringify(input);
  const approved = await confirm(
    `Approve ${toolName}`,
    `${toolName}: ${String(target)}`,
  );
  if (approved && !destructive) approvedOperations.add(key);
  return approved;
}
