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
  await Bun.write(AUTH_PATH, JSON.stringify(auth, null, 2));
}

export async function clearAuth(): Promise<void> {
  try {
    await Bun.write(AUTH_PATH, JSON.stringify({ token: "" }, null, 2));
  } catch {
    /* ignore */
  }
}
