import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearningLoaderProps {
  className?: string;
  label?: string;
}

export default function LearningLoader({
  className,
  label = "Loading your learning space...",
}: LearningLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-80 w-full items-center justify-center overflow-hidden bg-background px-6",
        className,
      )}
    >
      <div className="relative flex flex-col items-center">
        <div
          aria-hidden="true"
          className="absolute -inset-12 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse"
        />

        <div
          className="relative flex h-24 w-32 items-end justify-center"
          aria-hidden="true"
        >
          <div className="absolute bottom-2 left-1/2 h-14 w-px -translate-x-1/2 bg-primary/30" />
          <div className="absolute bottom-3 left-1/2 h-14 w-12 origin-bottom-right -translate-x-full -skew-y-6 rounded-l-xl border border-primary/20 bg-card shadow-lg shadow-primary/10 motion-safe:animate-pulse" />
          <div className="absolute bottom-3 left-1/2 h-14 w-12 origin-bottom-left skew-y-6 rounded-r-xl border border-primary/20 bg-card shadow-lg shadow-primary/10 motion-safe:animate-pulse [animation-delay:180ms]" />
          <div className="absolute top-0 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 motion-safe:animate-bounce [animation-duration:1.6s]">
            <BookOpen className="h-6 w-6" strokeWidth={2.2} />
          </div>
        </div>

        <p className="relative mt-4 text-sm font-medium text-foreground">
          {label}
        </p>
        <div
          aria-hidden="true"
          className="relative mt-3 flex items-center gap-1.5"
        >
          {[0, 160, 320].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-bounce motion-reduce:opacity-70"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
