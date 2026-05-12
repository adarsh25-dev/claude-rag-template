"use client";

export function DotPattern({ className, opacity = 0.3 }: { className?: string; opacity?: number }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none dot-bg ${className || ""}`}
      style={{ opacity }}
    />
  );
}
