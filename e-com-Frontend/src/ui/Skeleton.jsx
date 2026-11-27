// Loading placeholders are shaped like the real layout. No circular spinners.
export default function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-raised ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-2" aria-hidden="true">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-col gap-2 p-2 pt-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
    </div>
  );
}
