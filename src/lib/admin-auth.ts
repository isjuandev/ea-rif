const ADMIN_SESSION_COOKIE = "rifa_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SETTINGS_PASSWORD || "";
}

async function sha256(input: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseCookies(cookieHeader: string | null) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((cookie) => cookie.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getAdminSessionMaxAge() {
  return SESSION_DURATION_SECONDS;
}

export function isAdminLoginValid(username: string, password: string) {
  return (
    Boolean(process.env.ADMIN_SETTINGS_USER) &&
    Boolean(process.env.ADMIN_SETTINGS_PASSWORD) &&
    username === process.env.ADMIN_SETTINGS_USER &&
    password === process.env.ADMIN_SETTINGS_PASSWORD
  );
}

export async function createAdminSessionValue() {
  const secret = getSessionSecret();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const signature = await sha256(`${expiresAt}.${secret}`);
  return `${expiresAt}.${signature}`;
}

export async function isAdminSessionAuthorized(cookieHeader: string | null) {
  const secret = getSessionSecret();

  if (!secret) {
    return false;
  }

  const session = parseCookies(cookieHeader)[ADMIN_SESSION_COOKIE];
  const [expiresAtRaw, signature] = session?.split(".") ?? [];
  const expiresAt = Number(expiresAtRaw);

  if (!expiresAt || !signature || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  return signature === (await sha256(`${expiresAt}.${secret}`));
}
