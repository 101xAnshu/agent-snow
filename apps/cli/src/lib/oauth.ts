import { saveAuth } from "./auth.js";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
const API_URL = process.env.API_URL ?? "http://localhost:3000";

function encodeState(port: number): string {
  return Buffer.from(JSON.stringify({ port })).toString("base64url");
}

export async function loginWithGitHub(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === "/callback") {
          const token = url.searchParams.get("token");
          if (token) {
            await saveAuth({ token });
            server.stop();
            resolve();
            return new Response(
              `<html>
                <body>
                  <h1>Authenticated!</h1>
                  <p>You can close this tab.</p>
                  <script>window.close()</script>
                </body>
              </html>`,
              {
                headers: {
                  "Content-Type": "text/html",
                },
              },
            );
          }
          return new Response("Missing token", { status: 400 });
        }

        return new Response("Not found", { status: 404 });
      },
    });

    const port = server.port;
    if (!port) {
      server.stop();
      reject(new Error("Failed to start callback server"));
      return;
    }

    const redirectUri = `${API_URL}/auth/callback`;
    const state = encodeState(port);
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&scope=read:user`;

    Bun.$`open ${githubUrl}`.catch(() => {
      Bun.$`start ${githubUrl}`.catch(() => {});
    });

    setTimeout(() => {
      server.stop();
      reject(new Error("Authentication timed out"));
    }, 300_000).unref();
  });
}
