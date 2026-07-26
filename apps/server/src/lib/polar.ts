import { Polar } from "@polar-sh/sdk";
import { logger } from "./logger.js";

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set`);
  return value;
}

let polarClient: Polar | null = null;

function getPolar(): Polar {
  if (!polarClient) {
    polarClient = new Polar({
      accessToken: getRequiredEnv("POLAR_ACCESS_TOKEN"),
      server:
        process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
    });
  }
  return polarClient;
}

export async function getAvailableCredits(userId: string): Promise<number> {
  try {
    const polar = getPolar();
    const meterId = getRequiredEnv("POLAR_CREDITS_METER_ID");
    const result = await polar.customerMeters.list({
      customerId: userId,
      meterId,
      limit: 1,
    });
    return result.result.items?.[0]?.balance ?? 0;
  } catch (err) {
    logger.error("Failed to fetch credit balance", {
      userId,
      error: String(err),
    });
    throw new Error("Unable to verify credit balance");
  }
}

export async function createCheckoutUrl(userId: string): Promise<string> {
  const polar = getPolar();
  const result = await polar.checkouts.create({
    products: [getRequiredEnv("POLAR_CREDIT_PACKAGE_PRICE_ID")],
    customerId: userId,
    successUrl: `${process.env.API_URL}/billing/success`,
  });
  return result.url;
}

export async function createCustomerPortalUrl(userId: string): Promise<string> {
  const polar = getPolar();
  const result = await polar.customerSessions.create({ customerId: userId });
  return result.customerPortalUrl;
}

export async function ingestAiUsage(
  userId: string,
  credits: number,
  metadata: Record<string, string> = {},
): Promise<void> {
  if (credits <= 0) return;
  try {
    const polar = getPolar();
    await polar.events.ingest({
      events: [
        {
          name: "ai_credits_used",
          customerId: userId,
          metadata: { credits: String(credits), ...metadata },
        },
      ],
    });
    logger.info("Credits ingested", { userId, credits });
  } catch (err) {
    logger.error("Failed to ingest credits", { userId, error: String(err) });
  }
}
