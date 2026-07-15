import dotenv from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

function resolveEnv(): void {
  if (!process.env.DATABASE_URL) {
    dotenv.config({
      path: path.resolve(import.meta.dirname, "../../../.env"),
    });
  }
}

function createClient(): PrismaClient {
  resolveEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set. Provide it via .env or environment variables.");
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({
    adapter,
    log: process.env.LOG_LEVEL === "debug" ? ["query", "info", "warn"] : undefined,
  });
}

let db: PrismaClient | null = null;

export function getDb(): PrismaClient {
  if (!db) {
    db = createClient();
  }
  return db;
}
