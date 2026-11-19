/**
 * Only same-site absolute paths are allowed after login. Rejects
 * `https://…`, `//host`, and backslash tricks that browsers normalise to `//`.
 */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }

  return value;
}
