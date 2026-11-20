import "server-only";

import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/server";
import { apiFetch, ApiError } from "@/lib/api/server";
import type { Order } from "@/lib/api/types";
import { readSessionToken } from "@/lib/auth/cookies";

export type OrderHandlerDeps = {
  api?: <T>(path: string, options?: ApiRequestOptions) => Promise<ApiEnvelope<T>>;
  siteUrl?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function failure(message: string, status: number): Response {
  return jsonResponse({ success: false, message, data: null, meta: null, errors: null }, status);
}

function isSameOrigin(request: Request, siteUrl?: string): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const origins = new Set<string>();

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // The env origin below still applies.
  }

  for (const candidate of [siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) {
      continue;
    }

    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // Ignore a malformed env value rather than disabling the check.
    }
  }

  return origins.has(origin);
}

/** FR-ORDER-12: the customer-facing cancel action goes through the transition table. */
export function createCancelOrderHandler(deps: OrderHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function cancel(request: Request, orderId: string): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    if (!/^\d+$/.test(orderId)) {
      return failure("Order not found.", 404);
    }

    const token = readSessionToken(request.headers.get("cookie"), "customer");

    if (!token) {
      return failure("Please sign in to continue.", 401);
    }

    try {
      const result = await call<Order>(`/orders/${orderId}/cancel`, { method: "POST", token });

      return jsonResponse({
        success: true,
        message: result.message,
        data: result.data,
        meta: null,
        errors: null,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        return failure(error.message, error.status);
      }

      return failure("The order service is unavailable.", 503);
    }
  };
}
