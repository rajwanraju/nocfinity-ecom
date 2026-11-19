export type SessionKind = "customer" | "staff";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEFAULT_COOKIE_NAMES: Record<SessionKind, string> = {
  customer: "nocfinity_token",
  staff: "nocfinity_admin_token",
};

export function sessionCookieName(kind: SessionKind): string {
  const configured =
    kind === "staff" ? process.env.ADMIN_AUTH_COOKIE_NAME : process.env.AUTH_COOKIE_NAME;

  return configured?.trim() || DEFAULT_COOKIE_NAMES[kind];
}

function cookieAttributes(maxAge: number): string {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];

  if (process.env.COOKIE_SECURE === "true") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function sessionCookie(kind: SessionKind, token: string): string {
  return [
    `${sessionCookieName(kind)}=${encodeURIComponent(token)}`,
    cookieAttributes(SESSION_MAX_AGE_SECONDS),
  ].join("; ");
}

export function clearedSessionCookie(kind: SessionKind): string {
  return [
    `${sessionCookieName(kind)}=`,
    cookieAttributes(0),
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ].join("; ");
}

export function readSessionToken(cookieHeader: string | null, kind: SessionKind): string | null {
  if (!cookieHeader) {
    return null;
  }

  const name = sessionCookieName(kind);

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();

      return value === "" ? null : decodeURIComponent(value);
    }
  }

  return null;
}
