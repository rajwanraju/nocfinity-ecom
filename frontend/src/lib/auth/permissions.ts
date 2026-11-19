export function hasPermission(
  granted: readonly string[] | null | undefined,
  required: string,
): boolean {
  return granted?.includes(required) ?? false;
}

export function filterByPermission<T extends { permission?: string }>(
  items: readonly T[],
  granted: readonly string[] | null | undefined,
): T[] {
  return items.filter((item) => !item.permission || hasPermission(granted, item.permission));
}
