import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  streamText,
  validateUIMessages,
  convertToModelMessages,
  isStepCount,
} from "ai";
import { getDb } from "db";
import { calculateCredits, modeSchema } from "shared";
import type { ModeType } from "shared";
import { compactMessagesForContext, createAgentDefinition } from "agent";
import { findSupportedChatModel } from "shared";
import type { AuthenticatedEnv } from "../middleware/require-auth.js";
import { logger } from "../lib/logger.js";
import { requireCreditsBalance } from "../middleware/require-credits-balance.js";
import { ingestAiUsage } from "../lib/polar.js";

const chatRoutes = new Hono<AuthenticatedEnv>();

export const chatRequestSchema = z.object({
  id: z.string(),
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["system", "user", "assistant"]),
      parts: z.array(z.record(z.string(), z.unknown())),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  mode: modeSchema,
  model: z.string().default("claude-opus-4-6"),
});

chatRoutes.post(
  "/",
  requireCreditsBalance,
  zValidator("json", chatRequestSchema),
  async (c) => {
    const db = getDb();
    const userId = c.var.userId;
    const { id, messages, mode, model } = c.req.valid("json");

    // Verify session ownership
    const session = await db.session.findUnique({
      where: { id, userId },
    });

    if (!session) return c.json({ error: "Session not found" }, 404);

    // Merge incoming messages with persisted messages
    const definition = createAgentDefinition(mode as ModeType, model);
    const tools = definition.tools;
    const storedMessages = await db.message.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });
    const previousMessages = storedMessages.length > 0
      ? storedMessages
      : Array.isArray(session.messages) ? session.messages : [];
    const mergedMessages = [
      ...(previousMessages as Array<Record<string, unknown>>),
    ];
    for (const msg of messages) {
      const entry = { ...msg, metadata: { mode, model } };
      const idx = mergedMessages.findIndex(
        (m) => (m as Record<string, unknown>).id === msg.id,
      );
      if (idx === -1) mergedMessages.push(entry);
      else mergedMessages[idx] = entry;
    }

    // Validate UI messages and convert to model messages
    const contextWindow = findSupportedChatModel(model)?.meta.contextWindow ?? 200_000;
    const compacted = compactMessagesForContext(mergedMessages, contextWindow);
    const validMessages = await validateUIMessages({
      messages: compacted.messages,
      tools: tools as any,
    });
    const modelMessages = await convertToModelMessages(validMessages, {
      tools: tools as any,
    });
    let completedUsage: any = null;
    // Stream AI response
    const result = streamText({
      model: definition.model,
      system: definition.system,
      messages: modelMessages,
      tools,
      providerOptions: definition.providerOptions as any,
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
          contextTokens: compacted.estimatedTokens,
          contextWindow,
          compacted: compacted.compacted,
          ...(completedUsage ? { usage: completedUsage } : {}),
        };
      },
      async onFinish(event) {
        try {
          const rows = (event.messages as Array<Record<string, any>>)
            .filter(
              (message) =>
                typeof message.id === "string" &&
                message.metadata?.compacted !== true,
            )
            .map((message) => ({
              id: message.id as string,
              sessionId: id,
              role: String(message.role),
              parts: (message.parts ?? message.content ?? []) as any,
              metadata: (message.metadata ?? null) as any,
            }));
          if (rows.length > 0) {
            await db.message.createMany({ data: rows, skipDuplicates: true });
            await db.session.update({ where: { id, userId }, data: { updatedAt: new Date() } });
          }

          if (completedUsage) {
            const credits = calculateCredits(model, completedUsage);
            await ingestAiUsage(userId, credits, { sessionId: id, model });
            logger.info("Chat completed", {
              sessionId: id,
              model,
              creditsUsed: credits,
            });
          }
        } catch (err) {
          logger.error("Failed to persist messages", {
            sessionId: id,
            error: String(err),
          });
        }
      },
    });
  },
);

export { chatRoutes };
