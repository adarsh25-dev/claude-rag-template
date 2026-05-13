"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function GlowCard({
  children,
  className,
  hoverScale = 1.01,
  elevatedHoverGlow = false,
}: {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
  /** Stronger cursor-follow glow on hover (e.g. hero prompt tiles). */
  elevatedHoverGlow?: boolean;
}) {
  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    node.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  };

  return (
    <motion.div
      whileHover={{ scale: hoverScale }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-elevated))]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div
          className="absolute inset-0"
          style={{
            background: elevatedHoverGlow
              ? "radial-gradient(520px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--color-accent) / 0.14), hsl(var(--color-accent-2) / 0.06) 38%, transparent 52%)"
              : "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--color-accent) / 0.08), transparent 42%)",
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
