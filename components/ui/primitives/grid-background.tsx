"use client";

export function GridBackground({ className, opacity = 0.4 }: { className?: string; opacity?: number }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none grid-bg ${className || ""}`}
      style={{ opacity, maskImage: "radial-gradient(ellipse at top, black 40%, transparent 80%)" }}
    />
  );
}
