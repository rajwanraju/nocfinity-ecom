import { Skeleton } from "@/components/ui/skeleton";

/** FR-ADMIN-9: one shell-shaped skeleton for every admin route transition. */
export default function AdminLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-28 w-full rounded-2xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}
