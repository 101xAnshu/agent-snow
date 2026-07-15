import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "db";
import type { AuthenticatedEnv } from "../middleware/require-auth.js";

const sessionRoutes = new Hono<AuthenticatedEnv>();

const listQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

sessionRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = getDb();
  const { take, skip } = c.req.valid("query");
  const userId = c.var.userId;

  const [sessions, total] = await Promise.all([
    db.session.findMany({
      where: { userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    }),
    db.session.count({ where: { userId } }),
  ]);

  return c.json({ sessions, total, take, skip });
});

sessionRoutes.get("/:id", async (c) => {
  const db = getDb();
  const id = c.req.param("id");
  const userId = c.var.userId;

  const session = await db.session.findFirst({
    where: { id, userId },
  });

  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json({ session });
});

const createSessionSchema = z.object({ title: z.string().min(1).max(200) });

sessionRoutes.post("/", zValidator("json", createSessionSchema), async (c) => {
  const db = getDb();
  const userId = c.var.userId;
  const { title } = c.req.valid("json");

  const session = await db.session.create({
    data: { userId, title },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return c.json({ session }, 201);
});

export { sessionRoutes };
