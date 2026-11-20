import "server-only";

import { z } from "zod";
import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/server";
import { apiFetch, ApiError } from "@/lib/api/server";
import type { OrderCheckoutPayload } from "@/lib/api/types";
import { readSessionToken } from "@/lib/auth/cookies";
import { readCartToken } from "@/lib/cart/cookies";

export type CheckoutListenerApi = (
  path: string,
  options?: ApiRequestOptions,
) => Promise<ApiEnvelope<unknown>>;

export type CheckoutHandlerDeps = {
  api?: CheckoutListenerApi;
  siteUrl?: string;
};

/**
 * Only the address and an optional coupon are accepted; totals and items come
 * from the server-side cart (FR-ORDER-2).
 */
const checkoutSchema = z.object({
  shipping_name: z.string().trim().min(1, "Enter the recipient's name.").max(120),
  shipping_phone: z.string().trim().min(1, "Enter a phone number.").max(30),
  shipping_line1: z.string().trim().min(1, "Enter a street address.").max(255),
  shipping_line2: z.string().trim().max(255).optional(),
  shipping_city: z.string().trim().min(1, "Enter a city.").max(120),
  shipping_state: z.string().trim().min(1, "Enter a state or region.").max(120),
  shipping_postal_code: z.string().trim().min(1, "Enter a postal code.").max(30),
  shipping_country: z.string().trim().length(2, "Choose a country."),
  notes: z.string().trim().max(1000).optional(),
  coupon_code: z.string().trim().max(50).optional(),
});

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function failure(
  message: string,
  status: number,
  errors: Record<string, string[]> | null = null,
  headers?: Record<string, string>,
): Response {
  return jsonResponse({ success: false, message, data: null, meta: null, errors }, status, headers);
}

function validationErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    (errors[field] ??= []).push(issue.message);
  }

  return errors;
}

function allowedOrigins(request: Request, siteUrl?: string): Set<string> {
  const origins = new Set<string>();

  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // A malformed request URL cannot be trusted; the env origin below still applies.
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

  return origins;
}

function isSameOrigin(request: Request, siteUrl?: string): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return allowedOrigins(request, siteUrl).has(origin);
}

/**
 * Creates the pending order and the Stripe PaymentIntent. The client secret is
 * returned to the browser because Stripe Elements needs it; the secret API key
 * never leaves Laravel.
 */
export function createCheckoutHandler(deps: CheckoutHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function checkout(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    const token = readSessionToken(request.headers.get("cookie"), "customer");

    if (!token) {
      return failure("Please sign in to continue.", 401);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }

    const parsed = checkoutSchema.safeParse(payload);

    if (!parsed.success) {
      return failure("The given data was invalid.", 422, validationErrors(parsed.error));
    }

    try {
      const result = (await call("/checkout", {
        method: "POST",
        token,
        cartToken: readCartToken(request.headers.get("cookie")),
        body: parsed.data,
        headers: { "Idempotency-Key": request.headers.get("idempotency-key") ?? "" },
      })) as ApiEnvelope<OrderCheckoutPayload>;

      return jsonResponse(
        {
          success: true,
          message: result.message,
          data: result.data,
          meta: null,
          errors: null,
        },
        201,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const headers: Record<string, string> = {};

        if (error.status === 429) {
          headers["retry-after"] = error.retryAfter ?? "60";
        }

        return failure(error.message, error.status, error.errors, headers);
      }

      return failure("The checkout service is unavailable.", 503);
    }
  };
}
