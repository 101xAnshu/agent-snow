import { runAgent } from "agent";
import { Mode, modeSchema, isSupportedChatModel, DEFAULT_CHAT_MODEL_ID } from "shared";
import type { ModeType } from "shared";

export const HEADLESS_PROTOCOL_VERSION = 1;

export type HeadlessOptions = {
  prompt: string;
  mode?: ModeType;
  model?: string;
  cwd?: string;
  maxSteps?: number;
  emit?: (event: Record<string, unknown>) => void;
};

export type ParsedHeadlessArgs = Omit<HeadlessOptions, "emit"> & {
  output: "json";
};

export function parseHeadlessArgs(argv: string[]): ParsedHeadlessArgs | null {
  const promptIndex = argv.indexOf("-p");
  if (promptIndex === -1) return null;
  const prompt = argv[promptIndex + 1];
  if (!prompt) throw new Error("-p requires a prompt");

  const valueAfter = (flag: string) => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const output = valueAfter("--output") ?? "json";
  if (output !== "json") throw new Error(`Unsupported output format: ${output}`);
  const rawMode = valueAfter("--agent-mode");
  const mode = rawMode ? modeSchema.parse(rawMode) : Mode.BUILD;
  const model = valueAfter("--model") ?? DEFAULT_CHAT_MODEL_ID;
  if (!isSupportedChatModel(model)) throw new Error(`Unsupported model: ${model}`);
  const rawMaxSteps = valueAfter("--max-steps");
  const maxSteps = rawMaxSteps === undefined ? undefined : Number(rawMaxSteps);
  if (maxSteps !== undefined && (!Number.isInteger(maxSteps) || maxSteps < 1)) {
    throw new Error("--max-steps must be a positive integer");
  }

  return {
    prompt,
    mode,
    model,
    cwd: valueAfter("--cwd"),
    maxSteps,
    output: "json",
  };
}

export async function runHeadless(options: HeadlessOptions): Promise<void> {
  const emit = options.emit ?? ((event) => process.stdout.write(`${JSON.stringify(event)}\n`));
  const result = await runAgent({
    ...options,
    onEvent: (event) =>
      emit({ protocol: "snow.agent", version: HEADLESS_PROTOCOL_VERSION, event }),
  });
  const finishEvent = result.events.at(-1);
  emit({
    protocol: "snow.agent",
    version: HEADLESS_PROTOCOL_VERSION,
    type: "result",
    text: result.text,
    steps: result.steps,
    usage: result.usage,
    reason: finishEvent?.type === "finish" ? finishEvent.reason : "completed",
  });
}
