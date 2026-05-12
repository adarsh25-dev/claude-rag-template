"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function GlowCard({
  children,
  className,
  hoverScale = 1.01,
}: {
  children: React.ReactNode;
  className?: string;
  hoverScale?: number;
}) {
  return (
    <motion.div
      whileHover={{ scale: hoverScale }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative rounded-2xl bg-[hsl(var(--color-bg-elevated))] border border-[hsl(var(--color-border))] overflow-hidden group",
        className
      )}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), hsl(var(--color-accent) / 0.06), transparent 40%)",
          }}
        />
      </div>
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
