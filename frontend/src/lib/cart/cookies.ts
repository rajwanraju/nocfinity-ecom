export const CART_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const DEFAULT_CART_COOKIE = "nocfinity_cart";

export function cartCookieName(): string {
  return process.env.CART_COOKIE_NAME?.trim() || DEFAULT_CART_COOKIE;
}

function cookieAttributes(maxAge: number): string {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAge}`];

  if (process.env.COOKIE_SECURE === "true") {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

export function cartCookie(token: string): string {
  return [
    `${cartCookieName()}=${encodeURIComponent(token)}`,
    cookieAttributes(CART_MAX_AGE_SECONDS),
  ].join("; ");
}

export function clearedCartCookie(): string {
  return [`${cartCookieName()}=`, cookieAttributes(0)].join("; ");
}

/** Reads the guest cart token from a raw Cookie header without a parser dependency. */
export function readCartToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.split("=");
    const name = rawName?.trim();

    if (name !== cartCookieName()) {
      continue;
    }

    const value = rest.join("=").trim();

    if (!value) {
      return null;
    }

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}
