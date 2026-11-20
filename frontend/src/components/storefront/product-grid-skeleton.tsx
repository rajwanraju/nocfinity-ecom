import { Skeleton } from "@/components/ui/skeleton";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div className="space-y-3" key={index}>
          <Skeleton className="aspect-[0.82] rounded-[18px]" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
