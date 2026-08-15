import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAuth, saveAuth } from "./auth.js";

const root = await mkdtemp(join(tmpdir(), "snow-auth-test-"));
const authPath = join(root, ".snow", "auth.json");

afterAll(() => rm(root, { recursive: true, force: true }));

describe("auth storage", () => {
  test("round trips a token", async () => {
    await saveAuth({ token: "test-token" }, authPath);
    expect(await loadAuth(authPath)).toEqual({ token: "test-token" });
  });

  test.skipIf(process.platform === "win32")("uses owner only permissions", async () => {
    await saveAuth({ token: "test-token" }, authPath);
    expect((await stat(authPath)).mode & 0o777).toBe(0o600);
  });
});
