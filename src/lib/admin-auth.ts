export function isAdminAuthorized(authorization: string | null) {
  const expectedUser = process.env.ADMIN_SETTINGS_USER;
  const expectedPassword = process.env.ADMIN_SETTINGS_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return false;
  }

  const [scheme, credentials] = authorization?.split(" ") ?? [];

  if (scheme !== "Basic" || !credentials) {
    return false;
  }

  try {
    const [user, password] = atob(credentials).split(":");
    return user === expectedUser && password === expectedPassword;
  } catch {
    return false;
  }
}
