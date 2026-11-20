import "server-only";

import type { ApiPagination, QueryValue } from "@/lib/api/server";
import { apiFetch, ApiError } from "@/lib/api/server";
import { getSessionToken } from "@/lib/auth/server";

export type AdminResult<T> =
  | { ok: true; data: T; pagination: ApiPagination | null; message: string }
  | { ok: false; status: number; message: string };

/**
 * Server-side admin read. Pages never expose the staff bearer token; a failed
 * call returns a typed result so the screen can render a 403/retry panel
 * instead of the generic error boundary.
 */
export async function adminGet<T>(
  path: string,
  query?: Record<string, QueryValue>,
): Promise<AdminResult<T>> {
  const token = await getSessionToken("staff");

  if (!token) {
    return { ok: false, status: 401, message: "Please sign in to continue." };
  }

  try {
    const result = await apiFetch<T>(`/admin/${path}`, { token, query });

    return {
      ok: true,
      data: result.data,
      pagination: result.meta?.pagination ?? null,
      message: result.message,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, status: error.status, message: error.message };
    }

    return { ok: false, status: 503, message: "The admin service is unavailable." };
  }
}

export type SearchParams = Record<string, string | string[] | undefined>;

export function paramValue(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;

  return single === undefined || single === "" ? undefined : single;
}

export function pageParam(value: string | string[] | undefined): number {
  const raw = paramValue(value);
  const parsed = Number.parseInt(raw ?? "1", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
