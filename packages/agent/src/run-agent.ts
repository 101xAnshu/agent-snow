import { streamText, isStepCount } from "ai";
import type { LanguageModel, LanguageModelUsage, ModelMessage } from "ai";
import { Mode, DEFAULT_CHAT_MODEL_ID } from "shared";
import type { ModeType, ThinkingLevel } from "shared";
import { createAgentDefinition } from "./definition.js";
import { executeLocalTool } from "./local-tools.js";

type Usage = LanguageModelUsage;

export type AgentEvent =
  | { type: "step-start"; step: number }
  | { type: "text-delta"; step: number; delta: string }
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      step: number;
      toolName: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool-output";
      step: number;
      toolName: string;
      output: string;
      metadata?: Record<string, unknown>;
    }
  | { type: "tool-update"; step: number; toolName: string; update: string }
  | { type: "tool-error"; step: number; toolName: string; error: string }
  | { type: "step-finish"; step: number; reason: string; usage: Usage }
  | { type: "finish"; reason: string; usage: Usage };

export type RunAgentOptions = {
  prompt: string;
  messages?: ModelMessage[];
  mode?: ModeType;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  cwd?: string;
  maxSteps?: number;
  abortSignal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
  languageModel?: LanguageModel;
  onApprovalRequired?: (request: {
    toolName: string;
    input: Record<string, unknown>;
  }) => Promise<boolean>;
  steeringQueue?: AgentInputQueue;
  followUpQueue?: AgentInputQueue;
  afterToolCall?: (result: {
    toolName: string;
    input: Record<string, unknown>;
    output: string;
    error?: string;
  }) =>
    Promise<Record<string, unknown> | void> | Record<string, unknown> | void;
  sequentialTools?: string[];
};

export type AgentInputQueue = {
  push(input: string): void;
  take(): string[];
};

export function createAgentInputQueue(): AgentInputQueue {
  const inputs: string[] = [];
  return {
    push(input) {
      if (input.trim()) inputs.push(input.trim());
    },
    take() {
      return inputs.splice(0, inputs.length);
    },
  };
}

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
    { type: "text"; value: string } | { type: "error-text"; value: string };
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

export async function runAgent(options: RunAgentOptions): Promise<AgentResult> {
  const {
    prompt,
    mode = Mode.BUILD,
    model = DEFAULT_CHAT_MODEL_ID,
    thinkingLevel = "off",
    cwd,
    maxSteps = 10,
    abortSignal,
    onEvent,
    languageModel: injectedLanguageModel,
    onApprovalRequired,
    steeringQueue,
    followUpQueue,
    afterToolCall,
    sequentialTools = ["writeFile", "editFile", "bash"],
  } = options;

  const definition = createAgentDefinition(mode, model, thinkingLevel);
  const languageModel = injectedLanguageModel ?? definition.model;
  const providerOptions = definition.providerOptions;
  const tools = definition.tools as any;
  const system = definition.system;

  const messages: ModelMessage[] = [...(options.messages ?? [])];
  if (prompt) messages.push({ role: "user", content: prompt });
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

    const result = streamText({
      model: languageModel,
      system,
      messages,
      tools,
      providerOptions: providerOptions as any,
      stopWhen: isStepCount(1),
      abortSignal,
    });

    let stepText = "";
    for await (const delta of result.textStream) {
      stepText += delta;
      text += delta;
      emit({ type: "text-delta", step: steps, delta });
    }

    const stepUsage = await result.usage;
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

    if (stepText) {
      emit({ type: "text", text: stepText });
    }

    const toolCalls = await result.toolCalls;
    const stepFinishReason = await result.finishReason;
    emit({
      type: "step-finish",
      step: steps,
      reason: stepFinishReason,
      usage: stepUsage,
    });

    if (toolCalls.length === 0) {
      finishReason = stepFinishReason;
      const followUps = followUpQueue?.take() ?? [];
      if (followUps.length > 0 && steps < maxSteps) {
        messages.push({ role: "user", content: followUps.join("\n\n") });
        continue;
      }
      break;
    }

    const assistantParts: Array<TextPart | ToolCallPart> = [
      ...(stepText ? [{ type: "text" as const, text: stepText }] : []),
      ...toolCalls.map((tc) => ({
        type: "tool-call" as const,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        input: (tc.input ?? {}) as Record<string, unknown>,
      })),
    ];
    messages.push({ role: "assistant", content: assistantParts });

    const executeTool = async (tc: (typeof toolCalls)[number]) => {
      const input = (tc.input ?? {}) as Record<string, unknown>;
      emit({
        type: "tool-update",
        step: steps,
        toolName: tc.toolName,
        update: "started",
      });
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
          onApprovalRequired ? { onApprovalRequired } : { trusted: true },
        );
        const metadata = await afterToolCall?.({
          toolName: tc.toolName,
          input,
          output,
        });
        emit({
          type: "tool-update",
          step: steps,
          toolName: tc.toolName,
          update: "completed",
        });
        emit({
          type: "tool-output",
          step: steps,
          toolName: tc.toolName,
          output,
          ...(metadata ? { metadata } : {}),
        });
        return {
          type: "tool-result",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          output: {
            type: "text",
            value: metadata
              ? `${output}\n\nTool metadata: ${JSON.stringify(metadata)}`
              : output,
          },
        } satisfies ToolResultPart;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({
          type: "tool-error",
          step: steps,
          toolName: tc.toolName,
          error: message,
        });
        const metadata = await afterToolCall?.({
          toolName: tc.toolName,
          input,
          output: message,
          error: message,
        });
        emit({
          type: "tool-update",
          step: steps,
          toolName: tc.toolName,
          update: "failed",
        });
        return {
          type: "tool-result",
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          output: {
            type: "error-text",
            value: metadata
              ? `${message}\n\nTool metadata: ${JSON.stringify(metadata)}`
              : message,
          },
        } satisfies ToolResultPart;
      }
    };
    const results = new Map<string, ToolResultPart>();
    const parallel = toolCalls.filter(
      (tc) => !sequentialTools.includes(tc.toolName),
    );
    const sequential = toolCalls.filter((tc) =>
      sequentialTools.includes(tc.toolName),
    );
    const parallelResults = await Promise.all(parallel.map(executeTool));
    for (const result of parallelResults)
      results.set(result.toolCallId, result);
    for (const tc of sequential) {
      const result = await executeTool(tc);
      results.set(result.toolCallId, result);
    }
    const toolResultParts = toolCalls.flatMap((tc) => {
      const result = results.get(tc.toolCallId);
      return result ? [result] : [];
    });
    messages.push({ role: "tool", content: toolResultParts });

    const steering = steeringQueue?.take() ?? [];
    if (steering.length > 0)
      messages.push({ role: "user", content: steering.join("\n\n") });
  }

  emit({ type: "finish", reason: finishReason, usage });

  return { text, steps, usage, events, messages };
}
