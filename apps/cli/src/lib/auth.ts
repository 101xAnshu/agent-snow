import { chmod, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";

const AUTH_PATH = `${process.env.HOME ?? process.env.USERPROFILE}/.snow/auth.json`;

export type AuthData = { token: string };

export async function loadAuth(): Promise<AuthData | null> {
  try {
    const file = Bun.file(AUTH_PATH);
    if (!(await file.exists())) return null;
    const data = (await file.json()) as AuthData;
    return data?.token ? data : null;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: AuthData): Promise<void> {
  await mkdir(dirname(AUTH_PATH), { recursive: true });
  await Bun.write(AUTH_PATH, JSON.stringify(auth, null, 2));
  try {
    await chmod(AUTH_PATH, 0o600);
  } catch {
    // Windows does not consistently support POSIX permission bits.
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await unlink(AUTH_PATH);
  } catch {
    /* ignore */
  }
}
