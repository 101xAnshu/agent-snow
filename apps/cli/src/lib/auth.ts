import { chmod, mkdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";

export function getAuthPath(): string {
  return `${process.env.HOME ?? process.env.USERPROFILE}/.snow/auth.json`;
}

export type AuthData = { token: string };

export async function loadAuth(authPath = getAuthPath()): Promise<AuthData | null> {
  try {
    const file = Bun.file(authPath);
    if (!(await file.exists())) return null;
    const data = (await file.json()) as AuthData;
    return data?.token ? data : null;
  } catch {
    return null;
  }
}

export async function saveAuth(auth: AuthData, authPath = getAuthPath()): Promise<void> {
  await mkdir(dirname(authPath), { recursive: true });
  await Bun.write(authPath, JSON.stringify(auth, null, 2));
  try {
    await chmod(authPath, 0o600);
  } catch {
    // Windows does not consistently support POSIX permission bits.
  }
}

export async function clearAuth(authPath = getAuthPath()): Promise<void> {
  try {
    await unlink(authPath);
  } catch {
    /* ignore */
  }
}
