"use client";

import { cn } from "@/lib/utils";

export function ShimmerText({
  children,
  className,
  reduceMotion,
}: {
  children: React.ReactNode;
  className?: string;
  /** When true, gradient is static (no shimmer keyframes). */
  reduceMotion?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-[hsl(var(--color-text-secondary,215_16%_62%))] via-[hsl(var(--color-text-primary,210_28%_90%))] to-[hsl(var(--color-text-secondary,215_16%_62%))] bg-clip-text text-transparent",
        !reduceMotion && "animate-shimmer",
        className,
      )}
      style={{ backgroundSize: "200% 100%" }}
    >
      {children}
    </span>
  );
}
