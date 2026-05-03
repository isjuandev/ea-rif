"use client";

import { cn } from "@/components/utils";

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block animate-pulse rounded bg-white/10", className)} />;
}

export function TextSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-4", className)} />;
}

export function PackageCardSkeleton() {
  return (
    <article className="card card--elevated min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="size-10 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-9 w-36" />
      <Skeleton className="mt-4 h-4 w-28" />
      <Skeleton className="mt-5 h-11 w-full rounded-md" />
    </article>
  );
}
