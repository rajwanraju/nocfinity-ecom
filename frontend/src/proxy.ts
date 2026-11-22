import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, type SessionKind } from "@/lib/auth/cookies";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

type Guard = {
  area: string;
  kind: SessionKind;
  loginPath: string;
};

const GUARDS: Guard[] = [
  { area: "/admin", kind: "staff", loginPath: "/admin/login" },
  { area: "/account", kind: "customer", loginPath: "/login" },
  { area: "/checkout", kind: "customer", loginPath: "/login" },
];

const PUBLIC_PREFIXES = [
  "/admin/login",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function guardFor(pathname: string): Guard | null {
  return (
    GUARDS.find(
      (guard) =>
        pathname === guard.area ||
        pathname.startsWith(`${guard.area}/`)
    ) ?? null
  );
}

function apiOrigin(): string | null {
  // `.env.example` ships API_PUBLIC_ORIGIN as an empty string ("fall back to
  // API_URL"), so a blank value must be treated as unset rather than as a
  // deliberate empty origin. Otherwise product images are blocked by CSP.
  const configured = process.env.API_PUBLIC_ORIGIN?.trim();
  const value = configured ? configured : process.env.API_URL;

  if (!value) return null;

  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

/**
 * The public scheme matters for HSTS and `upgrade-insecure-requests`: behind a
 * TLS-terminating proxy the internal hop is HTTP, so `x-forwarded-proto` wins.
 */
function isSecureRequest(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");

  if (forwarded) {
    return forwarded.split(",")[0].trim().toLowerCase() === "https";
  }

  return request.nextUrl.protocol === "https:";
}

/**
 * CSP is set here rather than in `next.config.ts` because it depends on the
 * request (HTTPS or not) and on runtime env (`API_PUBLIC_ORIGIN`). The remaining
 * static hardening headers live in `next.config.ts` and apply to every route.
 */
function applyCsp(response: NextResponse, secure: boolean): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy({
      isDev: process.env.NODE_ENV !== "production",
      apiOrigin: apiOrigin(),
      secure,
    }),
  );

  return response;
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // Only enable transport hardening when the browser is actually on HTTPS.
  const secure = isSecureRequest(request) && process.env.NODE_ENV === "production";

  const guard = guardFor(pathname);

  // Redirect unauthenticated users from protected routes.
  if (
    guard &&
    !isPublic(pathname) &&
    !request.cookies.get(sessionCookieName(guard.kind))
  ) {
    const url = request.nextUrl.clone();

    url.pathname = guard.loginPath;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);

    return applyCsp(NextResponse.redirect(url), secure);
  }

  // Next.js does not consume the CSP from the request side (no nonce is issued),
  // so it is applied to the document response only.
  return applyCsp(NextResponse.next(), secure);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
