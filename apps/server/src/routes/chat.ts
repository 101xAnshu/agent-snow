import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { streamText, validateUIMessages, convertToModelMessages, isStepCount } from "ai";
import { getDb } from "db";
import { getToolContracts, modeSchema } from "shared";
import type { ModeType } from "shared";
import { resolveModel } from "../lib/models.js";
import { calculateCredits } from "../lib/credits.js";
import { buildSystemPrompt } from "../system-prompt.js";
import type { AuthenticatedEnv } from "../middleware/require-auth.js";
import { logger } from "../lib/logger.js";

const chatRoutes = new Hono<AuthenticatedEnv>();

const chatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })),
  mode: modeSchema,
  model: z.string().default("claude-opus-4-6"),
});

chatRoutes.post("/", zValidator("json", chatRequestSchema), async (c) => {
  const db = getDb();
  const userId = c.var.userId;
  const { id, messages, mode, model } = c.req.valid("json");

  // Verify session ownership
  const session = await db.session.findUnique({
    where: { id, userId },
  });

  if (!session) return c.json({ error: "Session not found" }, 404);

  // Merge incoming messages with persisted messages
  const tools = getToolContracts(mode as ModeType);
  const previousMessages = Array.isArray(session.messages) ? session.messages : [];
  const mergedMessages = [...previousMessages as Array<Record<string, unknown>>];
  for (const msg of messages) {
    const entry = { ...msg, metadata: { mode, model } };
    const idx = mergedMessages.findIndex((m) => (m as Record<string, unknown>).id === msg.id);
    if (idx === -1) mergedMessages.push(entry);
    else mergedMessages[idx] = entry;
  }

  // Validate UI messages and convert to model messages
  const validMessages = await validateUIMessages({ messages: mergedMessages, tools: tools as any });
  const modelMessages = await convertToModelMessages(validMessages, { tools: tools as any });
  let completedUsage: any = null;
  const { model: resolvedLanguageModel, providerOptions } = resolveModel(model);

  // Stream AI response
  const result = streamText({
    model: resolvedLanguageModel,
    system: buildSystemPrompt(mode as ModeType),
    messages: modelMessages,
    tools,
    providerOptions: providerOptions as any,
    stopWhen: isStepCount(10),
    onFinish: async (event) => {
      completedUsage = event.usage;
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validMessages,
    messageMetadata({ part }) {
      if (part.type === "start") return { mode, model };
      if (part.type !== "finish") return undefined;
      return {
        mode,
        model,
        ...(completedUsage ? { usage: completedUsage } : {}),
      };
    },
    async onFinish(event) {
      try {
        await db.session.update({
          where: { id, userId },
          data: { messages: event.messages as any },
        });

        if (completedUsage) {
          const credits = calculateCredits(model, completedUsage);
          logger.info("Chat completed", { sessionId: id, model, creditsUsed: credits });
        }
      } catch (err) {
        logger.error("Failed to persist messages", { sessionId: id, error: String(err) });
      }
    },
  });
});

export { chatRoutes };
