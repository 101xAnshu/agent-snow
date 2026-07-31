import type { ModeType } from "shared";

export type EvalTask = {
  id: string;
  category: string;
  description: string;
  prompt: string;
  setup?: Record<string, string>;
  check: {
    script: string;
    expectedExitCode?: number;
    expectedOutputContains?: string[];
  };
  timeoutSec?: number;
  maxSteps?: number;
  mode?: ModeType;
};

export type EvalStatus = "pass" | "fail" | "error";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type EvalRunResult = {
  task: EvalTask;
  status: EvalStatus;
  steps: number;
  usage: TokenUsage;
  wallMs: number;
  checkExitCode: number;
  checkOutput: string;
  error?: string;
};

export type EvalSummary = {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  totalTokens: number;
  totalWallMs: number;
};

export type EvalReport = {
  model: string;
  startedAt: string;
  results: EvalRunResult[];
  summary: EvalSummary;
};

export type RunAllOptions = {
  model: string;
  mode?: ModeType;
  timeoutSec?: number;
  onResult?: (result: EvalRunResult, index: number, total: number) => void;
};

export function toTokenUsage(
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
): TokenUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  };
}

