import "server-only";

import { apiBaseUrl } from "@/lib/api/server";
import { clearedSessionCookie, readSessionToken } from "@/lib/auth/cookies";

/**
 * Single admin BFF proxy. Every mutation still carries the httpOnly staff
 * token server-side, and the Laravel permission middleware remains the final
 * authority on each endpoint (FR-RBAC-6).
 */
export type AdminProxyDeps = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  siteUrl?: string;
};

function json(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function failure(message: string, status: number, headers?: Record<string, string>): Response {
  return json({ success: false, message, data: null, meta: null, errors: null }, status, headers);
}

function isSameOrigin(request: Request, siteUrl?: string): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  const allowed = new Set<string>();

  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    // The configured origin below still applies.
  }

  for (const candidate of [siteUrl, process.env.NEXT_PUBLIC_SITE_URL]) {
    if (!candidate) {
      continue;
    }

    try {
      allowed.add(new URL(candidate).origin);
    } catch {
      // Ignore a malformed env value rather than disabling the check.
    }
  }

  return allowed.has(origin);
}

export function createAdminProxyHandler(deps: AdminProxyDeps = {}) {
  const requestFetch = deps.fetchImpl ?? fetch;

  return async function handle(request: Request, segments: string[]): Promise<Response> {
    if (segments.length === 0) {
      return failure("Not found.", 404);
    }

    const mutating = request.method !== "GET" && request.method !== "HEAD";

    // SEC-9: state-changing admin calls accept only a same-origin browser request.
    if (mutating && !isSameOrigin(request, deps.siteUrl)) {
      return failure("Request origin is not allowed.", 403);
    }

    const token = readSessionToken(request.headers.get("cookie"), "staff");

    if (!token) {
      return failure("Please sign in to continue.", 401);
    }

    let base: string;

    try {
      base = deps.baseUrl ?? apiBaseUrl();
    } catch {
      return failure("The admin service is not configured.", 503);
    }

    const path = segments.map((segment) => encodeURIComponent(segment)).join("/");
    const url = new URL(`${base.replace(/\/+$/, "")}/admin/${path}`);

    for (const [key, value] of new URL(request.url).searchParams) {
      url.searchParams.append(key, value);
    }

    const headers = new Headers({ Accept: "application/json", Authorization: `Bearer ${token}` });
    let body: BodyInit | undefined;

    if (mutating) {
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("multipart/form-data")) {
        // Keep the original boundary; forwarding the bytes is enough.
        body = await request.arrayBuffer();
        headers.set("content-type", contentType);
      } else {
        const text = await request.text();

        if (text !== "") {
          body = text;
          headers.set("content-type", contentType || "application/json");
        }
      }
    }

    let response: Response;

    try {
      response = await requestFetch(url, {
        method: request.method,
        headers,
        body,
        cache: "no-store",
      });
    } catch {
      return failure("The admin service is unavailable.", 503);
    }

    const responseHeaders = new Headers();
    const responseType = response.headers.get("content-type");
    const retryAfter = response.headers.get("retry-after");

    if (responseType) {
      responseHeaders.set("content-type", responseType);
    }

    if (retryAfter) {
      responseHeaders.set("retry-after", retryAfter);
    }

    if (response.status === 401) {
      responseHeaders.set("set-cookie", clearedSessionCookie("staff"));
    }

    const text = response.status === 204 ? "" : await response.text();

    return new Response(text === "" ? null : text, {
      status: response.status,
      headers: responseHeaders,
    });
  };
}
