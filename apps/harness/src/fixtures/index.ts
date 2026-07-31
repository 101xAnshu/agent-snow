import type { EvalTask } from "../types.js";

export const fixtures: EvalTask[] = [
  {
    id: "write-file-hello",
    category: "validation",
    description: "Agent writes a file with exact content.",
    prompt:
      "Create a file named hello.txt in the current directory containing exactly the text: hello from snow",
    setup: {},
    check: {
      script: `test "$(cat hello.txt)" = "hello from snow"`,
    },
    timeoutSec: 120,
  },
  {
    id: "run-script-sum",
    category: "validation",
    description: "Agent writes a small shell script and runs it with arguments.",
    prompt:
      "Create a shell script named sum.sh that prints the sum of its two numeric arguments. Then run it with arguments 2 and 3 and tell me the result.",
    setup: {},
    check: {
      script: `test "$(bash sum.sh 2 3)" = "5"`,
    },
    timeoutSec: 120,
  },
];

export function listFixtures(): EvalTask[] {
  return fixtures;
}
