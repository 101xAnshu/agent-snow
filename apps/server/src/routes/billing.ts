import { Hono } from "hono";
import { createCheckoutUrl, createCustomerPortalUrl } from "../lib/polar.js";
import type { AuthenticatedEnv } from "../middleware/require-auth.js";
import { logger } from "../lib/logger.js";

const billingRoutes = new Hono<AuthenticatedEnv>();

billingRoutes.post("/checkout", async (c) => {
  try {
    return c.json({ url: await createCheckoutUrl(c.var.userId) });
  } catch (err) {
    logger.error("Checkout failed", { error: String(err) });
    return c.json({ error: "Failed to create checkout session" }, 500);
  }
});

billingRoutes.post("/portal", async (c) => {
  try {
    return c.json({ url: await createCustomerPortalUrl(c.var.userId) });
  } catch (err) {
    logger.error("Portal failed", { error: String(err) });
    return c.json({ error: "Failed to create portal session" }, 500);
  }
});

const billingPublicRoutes = new Hono();

billingPublicRoutes.get("/success", (c) =>
  c.html(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
    <div style="text-align:center;"><h1>Payment Successful</h1><p>Your credits have been added. Close this tab.</p><script>window.close()</script></div></body></html>`),
);

export { billingRoutes, billingPublicRoutes };
