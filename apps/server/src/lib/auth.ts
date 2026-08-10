import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export async function authenticateGitHubToken(
  token: string
): Promise<{ id: number; login: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const body = await res.json() as { id: number; login: string };
    return body;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function signSessionToken(userId: string, githubUserId: number): string {
  return jwt.sign({ sub: userId, githubId: githubUserId }, getJwtSecret(), { expiresIn: "24h" });
}

export type OAuthState = { port: number; nonce: string };

export function signOAuthState(state: OAuthState): string {
  return jwt.sign(state, getJwtSecret(), { expiresIn: "10m" });
}

export function verifyOAuthState(state: string): OAuthState | null {
  try {
    const payload = jwt.verify(state, getJwtSecret()) as OAuthState;
    if (
      typeof payload.port !== "number" ||
      payload.port <= 0 ||
      payload.port >= 65536 ||
      typeof payload.nonce !== "string" ||
      payload.nonce.length < 16
    ) {
      return null;
    }
    return { port: payload.port, nonce: payload.nonce };
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string): { sub: string; githubId: number } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { sub: string; githubId: number };
  } catch {
    return null;
  }
}
