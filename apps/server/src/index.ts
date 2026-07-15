import { serve } from "bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "./lib/logger.js";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { requireAuth, type AuthenticatedEnv } from "./middleware/require-auth.js";

const app = new Hono();

app.use("*", cors());
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  logger.info(`${c.req.method} ${c.req.path} -> ${c.res.status} (${Date.now() - start}ms)`);
});

app.route("/health", healthRoutes);
app.route("/auth", authRoutes);
app.route("/sessions", sessionRoutes);

const chat = new Hono<AuthenticatedEnv>();
chat.use(requireAuth);
chat.route("/", chatRoutes);
app.route("/chat", chat);

app.onError((err, c) => {
  logger.error("Unhandled error", { error: String(err) });
  return c.json({ error: "Internal server error" }, 500);
});

serve({ fetch: app.fetch, port: parseInt(process.env.SERVER_PORT ?? "3000", 10) });
logger.info(`Server listening on http://localhost:${process.env.SERVER_PORT ?? "3000"}`);
