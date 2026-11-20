import "server-only";

import { z } from "zod";
import type { ApiEnvelope, ApiRequestOptions } from "@/lib/api/server";
import { apiFetch, ApiError } from "@/lib/api/server";
import { readCartToken } from "@/lib/cart/cookies";
import { clearedSessionCookie, readSessionToken, sessionCookie, type SessionKind } from "./cookies";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  type: SessionKind;
  is_active: boolean;
  email_verified_at: string | null;
  created_at: string;
  roles?: string[];
  permissions?: string[];
};

type LoginPayload = {
  user: AuthUser;
  token: string;
  token_type: string;
  abilities: string[];
};

export type ListenerApi = <T>(path: string, options?: ApiRequestOptions) => Promise<ApiEnvelope<T>>;

export type AuthHandlerDeps = {
  api?: ListenerApi;
  siteUrl?: string;
};

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

const email = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.");

const password = z.string().min(10, "Use at least 10 characters.");

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(255),
    email,
    phone: z.string().trim().max(30).optional(),
    password,
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

const forgotPasswordSchema = z.object({ email });

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "This reset link is invalid."),
    email,
    password,
    password_confirmation: z.string().min(1, "Confirm your password."),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

const ROUTES: Record<SessionKind, { login: string; me: string; logout: string }> = {
  customer: { login: "/auth/login", me: "/auth/me", logout: "/auth/logout" },
  staff: {
    login: "/admin/auth/login",
    me: "/admin/auth/me",
    logout: "/admin/auth/logout",
  },
};

function envelope<T>(
  data: T,
  message = "OK",
  errors: Record<string, string[]> | null = null,
): ApiEnvelope<T> {
  return { success: true, message, data, meta: null, errors };
}

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

/**
 * SEC-9: state-changing BFF calls accept only a same-origin browser request.
 * Non-browser clients without an Origin header are still constrained by the
 * httpOnly SameSite cookie and the backend bearer check.
 */
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

export function createLoginHandler(kind: SessionKind, deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function login(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }

    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      return failure("The given data was invalid.", 422, validationErrors(parsed.error));
    }

    try {
      const result = await call<LoginPayload>(ROUTES[kind].login, {
        method: "POST",
        body: parsed.data,
        // FR-CART-5: the backend merges the guest cart into the user cart.
        cartToken: readCartToken(request.headers.get("cookie")),
      });

      if (!result.data?.token) {
        return failure("The authentication response was invalid.", 502);
      }

      return jsonResponse(
        envelope({ user: result.data.user, abilities: result.data.abilities }, result.message),
        200,
        { "set-cookie": sessionCookie(kind, result.data.token) },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiErrorResponse(error);
      }

      return failure("The authentication service is unavailable.", 503);
    }
  };
}

export function createRegisterHandler(deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function register(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }

    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return failure("The given data was invalid.", 422, validationErrors(parsed.error));
    }

    try {
      const result = await call<LoginPayload>("/auth/register", {
        method: "POST",
        body: parsed.data,
        // Registration signs the customer in, so their guest cart follows.
        cartToken: readCartToken(request.headers.get("cookie")),
      });

      if (!result.data?.token) {
        return failure("The registration response was invalid.", 502);
      }

      return jsonResponse(
        envelope({ user: result.data.user, abilities: result.data.abilities }, result.message),
        201,
        { "set-cookie": sessionCookie("customer", result.data.token) },
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiErrorResponse(error);
      }

      return failure("The authentication service is unavailable.", 503);
    }
  };
}

export function createForgotPasswordHandler(deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function forgotPassword(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }

    const parsed = forgotPasswordSchema.safeParse(payload);

    if (!parsed.success) {
      return failure("The given data was invalid.", 422, validationErrors(parsed.error));
    }

    try {
      const result = await call<null>("/auth/forgot-password", {
        method: "POST",
        body: parsed.data,
      });

      return jsonResponse(envelope(null, result.message));
    } catch (error) {
      if (error instanceof ApiError) {
        return apiErrorResponse(error);
      }

      return failure("The authentication service is unavailable.", 503);
    }
  };
}

export function createResetPasswordHandler(deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function resetPassword(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return failure("Request body must be valid JSON.", 400);
    }

    const parsed = resetPasswordSchema.safeParse(payload);

    if (!parsed.success) {
      return failure("The given data was invalid.", 422, validationErrors(parsed.error));
    }

    try {
      const result = await call<null>("/auth/reset-password", {
        method: "POST",
        body: parsed.data,
      });

      return jsonResponse(envelope(null, result.message));
    } catch (error) {
      if (error instanceof ApiError) {
        return apiErrorResponse(error);
      }

      return failure("The authentication service is unavailable.", 503);
    }
  };
}

export function createMeHandler(kind: SessionKind, deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function me(request: Request): Promise<Response> {
    const token = readSessionToken(request.headers.get("cookie"), kind);

    if (!token) {
      return failure("Please sign in to continue.", 401);
    }

    try {
      const result = await call<AuthUser>(ROUTES[kind].me, { token });

      return jsonResponse(envelope(result.data, result.message));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          return failure("Your session has expired. Please sign in again.", 401, null, {
            "set-cookie": clearedSessionCookie(kind),
          });
        }

        return apiErrorResponse(error);
      }

      return failure("The authentication service is unavailable.", 503);
    }
  };
}

export function createLogoutHandler(kind: SessionKind, deps: AuthHandlerDeps = {}) {
  const call = deps.api ?? apiFetch;

  return async function logout(request: Request): Promise<Response> {
    if (!isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    const token = readSessionToken(request.headers.get("cookie"), kind);

    if (token) {
      try {
        await call(ROUTES[kind].logout, { method: "POST", token });
      } catch {
        // The local session is cleared regardless; the backend token expires
        // on its own if this call could not be delivered.
      }
    }

    return jsonResponse(envelope(null, "Logged out successfully."), 200, {
      "set-cookie": clearedSessionCookie(kind),
    });
  };
}
