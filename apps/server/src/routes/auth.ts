import { Hono } from "hono";
import {
  authenticateGitHubToken,
  signOAuthState,
  signSessionToken,
  verifyOAuthState,
} from "../lib/auth.js";
import { logger } from "../lib/logger.js";

const authRoutes = new Hono();

authRoutes.get("/login", (c) => {
  const port = Number(c.req.query("port"));
  const nonce = c.req.query("nonce");
  const clientId = process.env.GITHUB_CLIENT_ID;
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";
  if (!clientId) return c.text("GITHUB_CLIENT_ID is not set", 500);
  if (!Number.isInteger(port) || port <= 0 || port >= 65536 || !nonce) {
    return c.text("Invalid login request", 400);
  }

  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", `${apiUrl}/auth/callback`);
  authorizeUrl.searchParams.set("scope", "read:user");
  authorizeUrl.searchParams.set("state", signOAuthState({ port, nonce }));
  return c.redirect(authorizeUrl.toString());
});

authRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) return c.text("Missing authorization code", 400);

  if (!state) return c.text("Missing state parameter", 400);
  const oauthState = verifyOAuthState(state);
  if (!oauthState) return c.text("Invalid state parameter", 400);

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

    const callbackUrl = new URL(
      `http://localhost:${oauthState.port}/callback`,
    );
    callbackUrl.searchParams.set("token", sessionToken);
    callbackUrl.searchParams.set("nonce", oauthState.nonce);
    return c.redirect(callbackUrl.toString());
  } catch (err) {
    logger.error("Auth callback failed", { error: String(err) });
    return c.text("Authentication failed", 500);
  }
});

export { authRoutes };
