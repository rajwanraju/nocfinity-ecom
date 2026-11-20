"use client";

import type { ApiEnvelope } from "@/lib/api/server";

export type AdminResponse<T> =
  | { ok: true; status: number; message: string; data: T }
  | { ok: false; status: number; message: string; errors: Record<string, string[]> | null };

type AdminRequestOptions = {
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  form?: FormData;
};

/**
 * Browser-side admin mutation through the BFF proxy. The staff token stays in
 * an httpOnly cookie; this helper only deals with the JSON envelope.
 */
export async function adminRequest<T = unknown>(
  path: string,
  options: AdminRequestOptions = {},
): Promise<AdminResponse<T>> {
  const { method = "POST", body, form } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;

  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }

  try {
    const response = await fetch(`/api/admin/${path.replace(/^\/+/, "")}`, {
      method,
      credentials: "same-origin",
      headers,
      body: payload,
    });
    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: envelope?.message || "Something went wrong. Please try again.",
        errors: envelope?.errors ?? null,
      };
    }

    return {
      ok: true,
      status: response.status,
      message: envelope?.message ?? "",
      data: (envelope?.data ?? null) as T,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      message: "The admin service is unavailable. Please try again.",
      errors: null,
    };
  }
}
