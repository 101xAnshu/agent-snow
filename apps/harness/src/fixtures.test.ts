import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { findBashBinary } from "agent";
import { buildSandbox, runCheck } from "./driver.js";
import { listFixtures } from "./fixtures/index.js";

const hasBash = await findBashBinary().then((b) => b !== null);

describe("fixtures", () => {
  test("ids are unique", () => {
    const ids = listFixtures().map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("have prompt, description, and check script", () => {
    for (const fixture of listFixtures()) {
      expect(fixture.prompt.length, `${fixture.id} prompt`).toBeGreaterThan(10);
      expect(fixture.description.length, `${fixture.id} description`).toBeGreaterThan(0);
      expect(fixture.check.script.length, `${fixture.id} check`).toBeGreaterThan(0);
      expect(fixture.category.length, `${fixture.id} category`).toBeGreaterThan(0);
    }
  });

  test.skipIf(!hasBash)(
    "checks fail on an unmodified sandbox",
    async () => {
      for (const fixture of listFixtures()) {
        if (fixture.category === "safety") continue;
        const sandbox = await buildSandbox(fixture);
        try {
          const outcome = await runCheck(fixture, sandbox);
          expect(outcome.passed, `${fixture.id} check passed on pristine sandbox`).toBe(false);
        } finally {
          await rm(sandbox, { recursive: true, force: true });
        }
      }
    },
  );
});
