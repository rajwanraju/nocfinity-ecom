import "server-only";

export type ApiPagination = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type ApiMeta = { pagination?: ApiPagination } & Record<string, unknown>;

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta: ApiMeta | null;
  errors: Record<string, string[]> | null;
};

export type QueryValue = string | number | boolean | null | undefined;

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  cartToken?: string | null;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  cache?: RequestCache;
  signal?: AbortSignal;
};

export type ApiClientConfig = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

/**
 * Normalised error for every non-2xx API response (FR-API-2).
 * Callers can inspect `errors` to map messages onto form fields.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: Record<string, string[]> | null;
  readonly meta: ApiMeta | null;
  readonly retryAfter: string | null;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> | null = null,
    meta: ApiMeta | null = null,
    retryAfter: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.meta = meta;
    this.retryAfter = retryAfter;
  }
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function emptyEnvelope<T>(): ApiEnvelope<T> {
  return {
    success: true,
    message: "",
    data: null as T,
    meta: null,
    errors: null,
  };
}

/**
 * Server-only API client. Tokens never leave the Next.js server.
 * Tests inject `fetchImpl`; production uses the global fetch.
 */
export function createApiClient({ baseUrl, fetchImpl = fetch }: ApiClientConfig) {
  return async function apiFetch<T>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiEnvelope<T>> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...options.headers,
    };

    let body: string | undefined;

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    if (options.cartToken) {
      headers["X-Cart-Token"] = options.cartToken;
    }

    const response = await fetchImpl(buildUrl(baseUrl, path, options.query), {
      method: options.method ?? "GET",
      headers,
      body,
      cache: options.cache ?? "no-store",
      signal: options.signal,
    });

    if (response.status === 204) {
      return emptyEnvelope<T>();
    }

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson && text !== "" ? (JSON.parse(text) as ApiEnvelope<T>) : null;

    if (!response.ok) {
      throw new ApiError(
        payload?.message || text || response.statusText || "Request failed.",
        response.status,
        payload?.errors ?? null,
        payload?.meta ?? null,
        response.headers.get("retry-after"),
      );
    }

    if (payload === null) {
      return text === "" ? emptyEnvelope<T>() : { ...emptyEnvelope<T>(), data: text as T };
    }

    return payload;
  };
}

export function apiBaseUrl(): string {
  const value = process.env.API_URL;

  if (!value) {
    throw new Error("API_URL is not configured. Copy frontend/.env.example to .env.local.");
  }

  return value;
}

/** Default server client bound to the configured Laravel API. */
export function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  return createApiClient({ baseUrl: apiBaseUrl() })(path, options);
}
