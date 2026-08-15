import { createMiddleware } from "hono/factory";
import { getAvailableCredits } from "../lib/polar.js";
import type { AuthenticatedEnv } from "./require-auth.js";
import { logger } from "../lib/logger.js";
import { findSupportedChatModel } from "shared";

export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(
  async (c, next) => {
    try {
      const body = (await c.req.raw.clone().json()) as { model?: string };
      if (
        body.model &&
        findSupportedChatModel(body.model)?.provider === "ollama"
      ) {
        await next();
        return;
      }
    } catch {
      // The route validator remains responsible for malformed request bodies.
    }
    const userId = c.var.userId;
    try {
      const balance = await getAvailableCredits(userId);
      if (balance <= 0) {
        return c.json(
          { error: "Insufficient credits. Run /upgrade to purchase more." },
          402,
        );
      }
      await next();
    } catch (err) {
      logger.error("Credit balance check failed", {
        userId,
        error: String(err),
      });
      return c.json(
        { error: "Unable to verify credits balance right now." },
        503,
      );
    }
  },
);
