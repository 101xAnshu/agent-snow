import { loadAuth } from "./auth.js";
import { getErrorMessage } from "./http-errors.js";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

async function authPost(path: string): Promise<string> {
  const auth = await loadAuth();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(await getErrorMessage(res));
  const { url } = (await res.json()) as { url: string };
  return url;
}

export async function openCheckoutUrl(): Promise<void> {
  const url = await authPost("/billing/checkout");
  Bun.$`open ${url}`.catch(() => Bun.$`start ${url}`.catch(() => {}));
}

export async function openPortalUrl(): Promise<void> {
  const url = await authPost("/billing/portal");
  Bun.$`open ${url}`.catch(() => Bun.$`start ${url}`.catch(() => {}));
}
