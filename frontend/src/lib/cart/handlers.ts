import "server-only";

import { z } from "zod";
import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/server";
import { apiFetch, ApiError } from "@/lib/api/server";
import type { Cart } from "@/lib/api/types";
import { readSessionToken } from "@/lib/auth/cookies";
import { cartCookie, readCartToken } from "./cookies";

export type CartAction =
  | { type: "show" }
  | { type: "add" }
  | { type: "update"; itemId: string }
  | { type: "remove"; itemId: string }
  | { type: "clear" }
  | { type: "apply-coupon" }
  | { type: "remove-coupon" };

export type CartListenerApi = (
  path: string,
  options?: ApiRequestOptions,
) => Promise<ApiEnvelope<unknown>>;

export type CartHandlerDeps = {
  api?: CartListenerApi;
  siteUrl?: string;
};

const quantity = z.number().int().min(1).max(1000);

const addSchema = z.object({
  product_id: z.number().int().positive(),
  quantity,
});

const updateSchema = z.object({ quantity });

const couponSchema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code.").max(64),
});

const ITEM_PATH = (itemId: string) => `/cart/items/${encodeURIComponent(itemId)}`;

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
    // A malformed request URL cannot be trusted; the env origin still applies.
  }

  for (const candidate of [siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) {
      continue;
    }

    try {
      origins.add(new URL(candidate).origin);
    } catch {
      // Ignore malformed env values rather than disabling the check.
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

function apiErrorResponse(error: ApiError): Response {
  const headers: Record<string, string> = {};

  if (error.status === 429) {
    headers["retry-after"] = error.retryAfter ?? "60";
  }

  return failure(error.message, error.status, error.errors, headers);
}

async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return failure("Request body must be valid JSON.", 400);
  }
}

/**
 * BFF cart endpoint. Guest tokens live in an httpOnly cookie and never reach
 * the browser; every mutation is origin-checked before the API is called.
 */
export function handleCartRequest(
  request: Request,
  action: CartAction,
  deps: CartHandlerDeps = {},
) {
  return route(request, action, deps);
}

async function route(
  request: Request,
  action: CartAction,
  deps: CartHandlerDeps,
): Promise<Response> {
  const call = deps.api ?? apiFetch;

  if (action.type !== "show" && !isSameOrigin(request, deps.siteUrl)) {
    return failure("Request origin is not allowed.", 403);
  }

  const cookieHeader = request.headers.get("cookie");
  const token = readSessionToken(cookieHeader, "customer");
  const cartToken = readCartToken(cookieHeader);

  try {
    if (action.type === "clear") {
      await call("/cart", { method: "DELETE", token, cartToken });

      return new Response(null, { status: 204 });
    }

    if (action.type === "remove") {
      await call(ITEM_PATH(action.itemId), { method: "DELETE", token, cartToken });

      return new Response(null, { status: 204 });
    }

    if (action.type === "remove-coupon") {
      const result = (await call("/cart/coupon", {
        method: "DELETE",
        token,
        cartToken,
      })) as ApiEnvelope<Cart>;

      return cartResponse(result, result.message);
    }

    if (action.type === "update") {
      const payload = await readJson(request);

      if (payload instanceof Response) {
        return payload;
      }

      const parsed = updateSchema.safeParse(payload);

      if (!parsed.success) {
        return failure("The given data was invalid.", 422, validationErrors(parsed.error));
      }

      const result = (await call(ITEM_PATH(action.itemId), {
        method: "PATCH",
        token,
        cartToken,
        body: parsed.data,
      })) as ApiEnvelope<Cart>;

      return cartResponse(result, result.message);
    }

    if (action.type === "add") {
      const payload = await readJson(request);

      if (payload instanceof Response) {
        return payload;
      }

      const parsed = addSchema.safeParse(payload);

      if (!parsed.success) {
        return failure("The given data was invalid.", 422, validationErrors(parsed.error));
      }

      const result = (await call("/cart/items", {
        method: "POST",
        token,
        cartToken,
        body: parsed.data,
      })) as ApiEnvelope<Cart>;

      return cartResponse(result, result.message);
    }

    if (action.type === "apply-coupon") {
      const payload = await readJson(request);

      if (payload instanceof Response) {
        return payload;
      }

      const parsed = couponSchema.safeParse(payload);

      if (!parsed.success) {
        return failure("The given data was invalid.", 422, validationErrors(parsed.error));
      }

      const result = (await call("/cart/coupon", {
        method: "POST",
        token,
        cartToken,
        body: { code: parsed.data.code.toUpperCase() },
      })) as ApiEnvelope<Cart>;

      return cartResponse(result, result.message);
    }

    const result = (await call("/cart", {
      method: "GET",
      token,
      cartToken,
    })) as ApiEnvelope<Cart>;

    return cartResponse(result, result.message);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(error);
    }

    return failure("The cart service is unavailable.", 503);
  }
}

function cartResponse(result: ApiEnvelope<Cart>, message: string): Response {
  const headers: Record<string, string> = {};
  const nextToken = result.meta?.cart_token;

  if (typeof nextToken === "string" && nextToken !== "") {
    headers["set-cookie"] = cartCookie(nextToken);
  }

  return jsonResponse(
    {
      success: result.success,
      message: message || result.message,
      data: result.data,
      // Never echo the raw guest token in the JSON body.
      meta: null,
      errors: result.errors,
    },
    result.success ? 200 : 400,
    headers,
  );
}
