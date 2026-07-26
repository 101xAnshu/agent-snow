import { loadAuth, clearAuth } from "./auth.js";
import { getErrorMessage } from "./http-errors.js";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

type FetchOptions = RequestInit & { retries?: number };

async function fetchWithRetry(
  path: string,
  options: FetchOptions = {},
): Promise<Response> {
  const { retries = 3, ...fetchOpts } = options;
  const auth = await loadAuth();

  const headers = new Headers(fetchOpts.headers);
  headers.set("Content-Type", "application/json");
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${API_URL}${path}`, { ...fetchOpts, headers });

      if (res.status === 401) {
        await clearAuth();
        throw new Error("Session expired. Run /login to continue.");
      }

      if (res.status >= 500 && attempt < retries - 1) {
        await new Promise((r) =>
          setTimeout(r, Math.min(1000 * 2 ** attempt, 5000)),
        );
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise((r) =>
        setTimeout(r, Math.min(1000 * 2 ** attempt, 5000)),
      );
    }
  }

  throw new Error(`Request failed: ${path}`);
}

export const api = {
  createSession: async (title: string) => {
    const res = await fetchWithRetry("/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json() as Promise<{ session: { id: string; title: string } }>;
  },
  getSession: async (id: string) => {
    const res = await fetchWithRetry(`/sessions/${id}`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json() as Promise<{ session: Record<string, unknown> }>;
  },
  listSessions: async (take = 50, skip = 0) => {
    const res = await fetchWithRetry(`/sessions?take=${take}&skip=${skip}`);
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json() as Promise<{
      sessions: Array<Record<string, unknown>>;
      total: number;
    }>;
  },
  getCheckoutUrl: async () => {
    const res = await fetchWithRetry("/billing/checkout");
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json() as Promise<{ checkoutUrl: string }>;
  },
  getBillingPortalUrl: async () => {
    const res = await fetchWithRetry("/billing/portal");
    if (!res.ok) throw new Error(await getErrorMessage(res));
    return res.json() as Promise<{ portalUrl: string }>;
  },
};
