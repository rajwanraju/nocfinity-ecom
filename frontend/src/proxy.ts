import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName, type SessionKind } from "@/lib/auth/cookies";
import { buildContentSecurityPolicy } from "@/lib/security/csp";

type Guard = {
  /** Prefix of the protected area. */
  area: string;
  kind: SessionKind;
  loginPath: string;
};

/**
 * Optimistic redirect guards only. The backend bearer check remains the
 * authority; a forged cookie reaches the page but every data call fails 401.
 */
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
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function guardFor(pathname: string): Guard | null {
  return (
    GUARDS.find((guard) => pathname === guard.area || pathname.startsWith(`${guard.area}/`)) ?? null
  );
}

function apiOrigin(): string | null {
  const value = process.env.API_URL;

  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const nonce = btoa(crypto.randomUUID());
  const csp = buildContentSecurityPolicy({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    apiOrigin: apiOrigin(),
  });

  const guard = guardFor(pathname);

  if (guard && !isPublic(pathname) && !request.cookies.get(sessionCookieName(guard.kind))) {
    const url = request.nextUrl.clone();
    url.pathname = guard.loginPath;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);

    const redirect = NextResponse.redirect(url);
    redirect.headers.set("content-security-policy", csp);
    redirect.headers.set("x-content-type-options", "nosniff");

    return redirect;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
