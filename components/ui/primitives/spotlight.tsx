"use client";

export function Spotlight({
  className,
  color = "hsl(206 48% 58% / 0.18)",
  size = 600,
}: {
  className?: string;
  color?: string;
  size?: number;
}) {
  return (
    <div
      className={`absolute pointer-events-none ${className || ""}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        filter: "blur(60px)",
      }}
    />
  );
}
