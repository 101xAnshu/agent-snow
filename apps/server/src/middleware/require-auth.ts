import { createMiddleware } from "hono/factory";
import { verifySessionToken } from "../lib/auth.js";

export type AuthenticatedEnv = { Variables: { userId: string } };

export const requireAuth = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }
  const token = header.slice(7);
  const payload = verifySessionToken(token);
  if (!payload) {
    return c.json({ error: "Invalid or expired token. Run /login again." }, 401);
  }
  c.set("userId", payload.sub);
  await next();
});
