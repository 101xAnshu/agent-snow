import { Hono } from "hono";
import { authenticateGitHubToken, signSessionToken } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const authRoutes = new Hono();

authRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) return c.text("Missing authorization code", 400);

  let redirectPort = 0;
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString()) as { port: number };
      if (typeof parsed.port === "number" && parsed.port > 0 && parsed.port < 65536) {
        redirectPort = parsed.port;
      }
    } catch {
      return c.text("Invalid state parameter", 400);
    }
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json() as { access_token?: string };
    if (!tokenData.access_token) return c.text("Failed to exchange authorization code", 400);

    const user = await authenticateGitHubToken(tokenData.access_token);
    if (!user) return c.text("Failed to authenticate with GitHub", 401);

    const userId = `github-${user.id}`;
    const sessionToken = signSessionToken(userId, user.id);
    logger.info("User authenticated", { userId, login: user.login });

    if (redirectPort) {
      return c.redirect(`http://localhost:${redirectPort}/callback?token=${sessionToken}`);
    }
    return c.json({ token: sessionToken });
  } catch (err) {
    logger.error("Auth callback failed", { error: String(err) });
    return c.text("Authentication failed", 500);
  }
});

export { authRoutes };
