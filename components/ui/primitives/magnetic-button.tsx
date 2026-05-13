"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { motionTapScale } from "@/lib/motion-ui";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

type MagneticButtonProps = Omit<HTMLMotionProps<"button">, "size" | "children"> & {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  href?: string;
};

export function MagneticButton({
  children,
  className,
  variant = "default",
  size = "default",
  href,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const reduceMotion = useReducedMotion();
  const tap = motionTapScale(reduceMotion);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variants = {
    default: "bg-[hsl(var(--color-bg-elevated))] text-[hsl(var(--color-text-primary))] border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]",
    primary: "bg-gradient-to-r from-[hsl(var(--color-accent))] to-[hsl(206,48%,48%)] text-[hsl(var(--color-bg))] border-transparent shadow-[0_0_20px_hsl(var(--color-accent-glow))] hover:shadow-[0_0_35px_hsl(var(--color-accent-glow))]",
    secondary: "bg-transparent text-[hsl(var(--color-text-primary))] border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]",
    ghost: "bg-transparent border-transparent text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))]",
  };

  const sizes = {
    default: "h-10 px-5 py-2 text-sm",
    sm: "h-8 px-3 text-xs rounded-lg",
    lg: "h-12 px-6 text-base",
  };

  const classes = cn(
    "inline-flex items-center justify-center rounded-xl border font-medium whitespace-nowrap transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))]/50 disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className
  );

  if (href) {
    return (
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <MotionLink
          href={href}
          className={classes}
          whileTap={tap}
        >
          {children}
        </MotionLink>
      </motion.div>
    );
  }

  return (
    <motion.button
      ref={ref}
      className={classes}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      {...props}
      whileTap={tap}
    >
      {children}
    </motion.button>
  );
}
