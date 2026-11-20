import { Pagination } from "@/components/ui/pagination";

export function AdminPagination({
  basePath,
  currentPage,
  lastPage,
  params,
}: {
  basePath: string;
  currentPage: number;
  lastPage: number;
  params?: Record<string, string | undefined>;
}) {
  if (lastPage <= 1) {
    return null;
  }

  function buildHref(page: number): string {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value) {
        search.set(key, value);
      }
    }

    search.set("page", String(page));

    return `${basePath}?${search.toString()}`;
  }

  return (
    <Pagination
      buildHref={buildHref}
      className="mt-6"
      currentPage={currentPage}
      lastPage={lastPage}
    />
  );
}
