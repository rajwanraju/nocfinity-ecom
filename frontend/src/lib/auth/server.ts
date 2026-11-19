import "server-only";

import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api/server";
import { sessionCookieName, type SessionKind } from "./cookies";
import type { AuthUser } from "./handlers";

const ME_PATHS: Record<SessionKind, string> = {
  customer: "/auth/me",
  staff: "/admin/auth/me",
};

export async function getSessionToken(kind: SessionKind): Promise<string | null> {
  const store = await cookies();

  return store.get(sessionCookieName(kind))?.value ?? null;
}

/**
 * Server-side session read for layouts and pages. Returns null instead of
 * redirecting; the proxy already redirects guests, and each page decides.
 */
export async function getSessionUser(kind: SessionKind): Promise<AuthUser | null> {
  const token = await getSessionToken(kind);

  if (!token) {
    return null;
  }

  try {
    const result = await apiFetch<AuthUser>(ME_PATHS[kind], { token });

    return result.data;
  } catch {
    return null;
  }
}
