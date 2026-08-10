import { generateText, isStepCount } from "ai";
import type { ModelMessage } from "ai";
import { getToolContracts, Mode, DEFAULT_CHAT_MODEL_ID } from "shared";
import type { ModeType } from "shared";
import { resolveModel } from "./models.js";
import { buildSystemPrompt } from "./system-prompt.js";
import { executeLocalTool } from "./local-tools.js";

type Usage = Awaited<ReturnType<typeof generateText>>["usage"];

export type AgentEvent =
  | { type: "step-start"; step: number }
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      step: number;
      toolName: string;
      input: Record<string, unknown>;
    }
  | { type: "tool-output"; step: number; toolName: string; output: string }
  | { type: "tool-error"; step: number; toolName: string; error: string }
  | { type: "finish"; reason: string; usage: Usage };

export type RunAgentOptions = {
  prompt: string;
  mode?: ModeType;
  model?: string;
  cwd?: string;
  maxSteps?: number;
  abortSignal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
};

export type AgentResult = {
  text: string;
  steps: number;
  usage: Usage;
  events: AgentEvent[];
  messages: ModelMessage[];
};

type TextPart = { type: "text"; text: string };
type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
};
type ToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output:
    | { type: "text"; value: string }
    | { type: "error-text"; value: string };
};

function emptyUsage(): Usage {
  return {
    inputTokens: 0,
    inputTokenDetails: {
      noCacheTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    outputTokens: 0,
    outputTokenDetails: { textTokens: 0, reasoningTokens: 0 },
    totalTokens: 0,
  };
}

export async function runAgent(
  options: RunAgentOptions,
): Promise<AgentResult> {
  const {
    prompt,
    mode = Mode.BUILD,
    model = DEFAULT_CHAT_MODEL_ID,
    cwd,
    maxSteps = 10,
    abortSignal,
    onEvent,
  } = options;

  const { model: languageModel, providerOptions } = resolveModel(model);
  const tools = getToolContracts(mode) as any;
  const system = buildSystemPrompt(mode);

  const messages: ModelMessage[] = [{ role: "user", content: prompt }];
  const events: AgentEvent[] = [];
  const emit = (event: AgentEvent) => {
    events.push(event);
    onEvent?.(event);
  };

  let steps = 0;
  let usage = emptyUsage();
  let text = "";
  let finishReason = "aborted";

  while (steps < maxSteps) {
    if (abortSignal?.aborted) {
      finishReason = "aborted";
      break;
    }

    steps++;
    emit({ type: "step-start", step: steps });

    const result = await generateText({
      model: languageModel,
      system,
      messages,
      tools,
      providerOptions: providerOptions as any,
      stopWhen: isStepCount(1),
      abortSignal,
    });

    const stepUsage = result.usage;
    usage = {
      inputTokens: (usage.inputTokens ?? 0) + (stepUsage?.inputTokens ?? 0),
      outputTokens: (usage.outputTokens ?? 0) + (stepUsage?.outputTokens ?? 0),
      totalTokens: (usage.totalTokens ?? 0) + (stepUsage?.totalTokens ?? 0),
      inputTokenDetails: {
        noCacheTokens:
          (usage.inputTokenDetails?.noCacheTokens ?? 0) +
          (stepUsage?.inputTokenDetails?.noCacheTokens ?? 0),
        cacheReadTokens:
          (usage.inputTokenDetails?.cacheReadTokens ?? 0) +
          (stepUsage?.inputTokenDetails?.cacheReadTokens ?? 0),
        cacheWriteTokens:
          (usage.inputTokenDetails?.cacheWriteTokens ?? 0) +
          (stepUsage?.inputTokenDetails?.cacheWriteTokens ?? 0),
      },
      outputTokenDetails: {
        textTokens:
          (usage.outputTokenDetails?.textTokens ?? 0) +
          (stepUsage?.outputTokenDetails?.textTokens ?? 0),
        reasoningTokens:
          (usage.outputTokenDetails?.reasoningTokens ?? 0) +
          (stepUsage?.outputTokenDetails?.reasoningTokens ?? 0),
      },
    };

    if (result.text) {
      text = result.text;
      emit({ type: "text", text: result.text });
    }

    if (result.toolCalls.length === 0) {
      finishReason = result.finishReason;
      break;
    }

    const assistantParts: Array<TextPart | ToolCallPart> = [
      ...(result.text ? [{ type: "text" as const, text: result.text }] : []),
      ...result.toolCalls.map((tc) => ({
        type: "tool-call" as const,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        input: (tc.input ?? {}) as Record<string, unknown>,
      })),
    ];
    messages.push({ role: "assistant", content: assistantParts });

    const toolResultParts: ToolResultPart[] = [];
    for (const tc of result.toolCalls) {
      const input = (tc.input ?? {}) as Record<string, unknown>;
      emit({
        type: "tool-call",
        step: steps,
        toolName: tc.toolName,
        input,
      });
      try {
        const output = await executeLocalTool(
          tc.toolName,
          tc.input,
          mode,
          cwd,
          { trusted: true },
        );
        emit({
          type: "tool-output",
          step: steps,
          toolName: tc.toolName,
          output,
        });
        toolResultParts.push({
          type: "tool-result",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          output: { type: "text", value: output },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({
          type: "tool-error",
          step: steps,
          toolName: tc.toolName,
          error: message,
        });
        toolResultParts.push({
          type: "tool-result",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          output: { type: "error-text", value: message },
        });
      }
    }
    messages.push({ role: "tool", content: toolResultParts });
  }

  emit({ type: "finish", reason: finishReason, usage });

  return { text, steps, usage, events, messages };
}
