import { cn } from "@/lib/utils";

export default function ContentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl bg-muted"
          />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
