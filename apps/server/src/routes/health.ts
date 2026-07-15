import { Hono } from "hono";

const healthRoutes = new Hono();

healthRoutes.get("/", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString(), uptime: process.uptime() })
);

export { healthRoutes };
