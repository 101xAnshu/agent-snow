import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createApp } from "./app.js";
import { signSessionToken, verifyOAuthState } from "./lib/auth.js";
import { chatRequestSchema } from "./routes/chat.js";

const previousSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-with-enough-entropy";
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

describe("public and protected routes", () => {
  const app = createApp();

  test("billing success is public HTML", async () => {
    const response = await app.request("/billing/success");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });

  test("billing checkout requires authentication", async () => {
    const response = await app.request("/billing/checkout", { method: "POST" });
    expect(response.status).toBe(401);
  });
});

describe("chat request contract", () => {
  test("accepts AI SDK UI messages", () => {
    const parsed = chatRequestSchema.safeParse({
      id: "session-1",
      mode: "PLAN",
      model: "gpt-4.1",
      messages: [
        {
          id: "message-1",
          role: "user",
          parts: [{ type: "text", text: "hello" }],
          metadata: { mode: "PLAN" },
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("authentication", () => {
  test("signed session tokens are accepted", async () => {
    const token = signSessionToken("github-1", 1);
    const response = await createApp().request("/billing/checkout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).not.toBe(401);
  });

  test("OAuth state rejects invalid input", () => {
    expect(verifyOAuthState("garbage")).toBeNull();
  });
});
