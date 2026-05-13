"use client";

import { useEffect, useRef } from "react";

export function AuroraBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = canvas.offsetWidth;
    let h = canvas.height = canvas.offsetHeight;

    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, w * 0.6);
    gradient.addColorStop(0, "hsla(206, 48%, 58%, 0.09)");
    gradient.addColorStop(0.5, "hsla(0, 0%, 4%, 0)");
    gradient.addColorStop(1, "hsla(0, 0%, 4%, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const handleResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className || ""}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.6 }}
      />
      {children}
    </div>
  );
}
