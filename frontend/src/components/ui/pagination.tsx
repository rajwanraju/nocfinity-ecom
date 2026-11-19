import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  lastPage: number;
  buildHref: (page: number) => string;
  className?: string;
};

const linkClass =
  "grid size-9 place-items-center rounded-full text-sm font-medium transition hover:bg-muted";
const disabledClass =
  "grid size-9 place-items-center rounded-full text-sm font-medium text-muted-foreground/40";

function Pagination({ currentPage, lastPage, buildHref, className }: PaginationProps) {
  const pages = Array.from({ length: Math.max(lastPage, 1) }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {currentPage > 1 ? (
        <Link aria-label="Previous page" className={linkClass} href={buildHref(currentPage - 1)}>
          <ChevronLeft aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledClass}>
          <ChevronLeft size={16} />
        </span>
      )}

      {pages.map((page) =>
        page === currentPage ? (
          <span
            aria-current="page"
            className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            key={page}
          >
            {page}
          </span>
        ) : (
          <Link aria-label={`Page ${page}`} className={linkClass} href={buildHref(page)} key={page}>
            {page}
          </Link>
        ),
      )}

      {currentPage < lastPage ? (
        <Link aria-label="Next page" className={linkClass} href={buildHref(currentPage + 1)}>
          <ChevronRight aria-hidden="true" size={16} />
        </Link>
      ) : (
        <span aria-hidden="true" className={disabledClass}>
          <ChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}

export { Pagination };
