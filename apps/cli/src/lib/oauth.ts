import open from "open";
import { saveAuth } from "./auth.js";

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

export async function loginWithGitHub(): Promise<void> {
  const apiUrl = process.env.API_URL ?? "http://localhost:3000";

  const nonce = crypto.randomUUID();

  let settled = false;

  return new Promise<void>((resolve, reject) => {
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const error = url.searchParams.get("error");

        if (error) {
          const msg = url.searchParams.get("error_description") ?? error;
          settled = true;
          reject(new Error(msg));
          setTimeout(() => server.stop(), 500);
          return new Response(`Authentication failed: ${msg}`, { status: 400 });
        }

        const token = url.searchParams.get("token");
        const callbackNonce = url.searchParams.get("nonce");

        if (!token || callbackNonce !== nonce) {
          settled = true;
          reject(new Error("Invalid authentication callback"));
          setTimeout(() => server.stop(), 500);
          return new Response("Bad request", { status: 400 });
        }

        try {
          settled = true;
          await saveAuth({ token });
          resolve();
          setTimeout(() => server.stop(), 500);
          return new Response("Authenticated! You can close this tab.");
        } catch (err) {
          settled = true;
          reject(err);
          setTimeout(() => server.stop(), 500);
          return new Response(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`, { status: 400 });
        }
      },
    });

    const port = server.port;
    if (typeof port !== "number") {
      server.stop();
      reject(new Error("Failed to start callback server"));
      return;
    }

    const authorizeUrl = new URL(`${apiUrl}/auth/login`);
    authorizeUrl.searchParams.set("port", String(port));
    authorizeUrl.searchParams.set("nonce", nonce);

    void open(authorizeUrl.toString());

    setTimeout(() => {
      if (!settled) {
        settled = true;
        server.stop();
        reject(new Error("Login timed out"));
      }
    }, LOGIN_TIMEOUT_MS);
  });
}
