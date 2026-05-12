"use client";

import { cn } from "@/lib/utils";

export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block bg-gradient-to-r from-[hsl(var(--color-text-secondary))] via-[hsl(var(--color-text-primary))] to-[hsl(var(--color-text-secondary))] bg-clip-text text-transparent animate-shimmer",
        className
      )}
      style={{ backgroundSize: "200% 100%" }}
    >
      {children}
    </span>
  );
}
