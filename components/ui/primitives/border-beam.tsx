"use client";

import { motion } from "framer-motion";

export function BorderBeam({
  className,
  duration = 4,
  size = 200,
}: {
  className?: string;
  duration?: number;
  size?: number;
}) {
  return (
    <div className={`absolute inset-0 rounded-2xl overflow-hidden pointer-events-none ${className || ""}`}>
      <motion.div
        className="absolute"
        style={{
          width: size,
          height: size,
          background: "conic-gradient(from 0deg, transparent, hsl(var(--color-accent)), transparent 30%)",
          filter: "blur(8px)",
        }}
        animate={{
          top: ["-50%", "100%"],
          left: ["-50%", "100%"],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
