
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
  const value =
    process.env.API_PUBLIC_ORIGIN ??
    process.env.API_URL;

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

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  return btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const nonce = createNonce();

  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV !== "production",
    apiOrigin: apiOrigin(),
  });

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

    const response = NextResponse.redirect(url);

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("X-Content-Type-Options", "nosniff");

    return response;
  }

  // Forward the nonce and CSP to Next.js.
  // Next.js uses the nonce when rendering framework scripts.
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Apply CSP to the browser response.
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
