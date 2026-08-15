import type {
  AgentInputQueue,
  AgentResult,
  RunAgentOptions,
} from "./run-agent.js";
import { createAgentInputQueue, runAgent } from "./run-agent.js";

export class AgentController {
  readonly steeringQueue: AgentInputQueue = createAgentInputQueue();
  readonly followUpQueue: AgentInputQueue = createAgentInputQueue();
  private history: RunAgentOptions["messages"] = [];
  private lastOptions: Omit<
    RunAgentOptions,
    "prompt" | "messages" | "steeringQueue" | "followUpQueue"
  > | null = null;

  async run(options: RunAgentOptions): Promise<AgentResult> {
    this.lastOptions = options;
    const result = await runAgent({
      ...options,
      messages: this.history,
      steeringQueue: this.steeringQueue,
      followUpQueue: this.followUpQueue,
    });
    this.history = result.messages;
    return result;
  }

  steer(instruction: string) {
    this.steeringQueue.push(instruction);
  }
  followUp(instruction: string) {
    this.followUpQueue.push(instruction);
  }

  async continue(): Promise<AgentResult | null> {
    if (!this.lastOptions) return null;
    return this.run({ ...this.lastOptions, prompt: "" });
  }

  reset() {
    this.history = [];
    this.steeringQueue.take();
    this.followUpQueue.take();
  }
}
