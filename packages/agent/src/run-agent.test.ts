import { describe, expect, test } from "bun:test";
import { createAgentInputQueue } from "./run-agent.js";

describe("agent input queues", () => {
  test("preserves order and drains atomically", () => {
    const queue = createAgentInputQueue();
    queue.push("first");
    queue.push("second");
    expect(queue.take()).toEqual(["first", "second"]);
    expect(queue.take()).toEqual([]);
  });

  test("ignores blank steering instructions", () => {
    const queue = createAgentInputQueue();
    queue.push("  ");
    expect(queue.take()).toEqual([]);
  });
});
