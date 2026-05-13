"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useDecodeText } from "@/src/hooks/useDecodeText";

gsap.registerPlugin(ScrollTrigger);

const ACCENT = "hsla(206, 48%, 58%, 0.3)";

const METRICS = [
  {
    label: "LATENCY",
    description: "Typical retrieval round-trip on warm paths.",
    endValue: 10,
    formatCounter: (v) => `${Math.round(v)}ms`,
  },
  {
    label: "UPTIME",
    description: "Hosted tier with redundant routing.",
    endValue: 99.9,
    formatCounter: (v) => `${v.toFixed(1)}%`,
  },
  {
    label: "SCALE",
    description: "Indexed vectors across workspaces.",
    endValue: 50,
    formatCounter: (v) => `${Math.round(v)}M+`,
  },
  {
    label: "OPERATIONS",
    description: "Clusters, shards, and upgrades you touch.",
    endValue: 0,
    formatCounter: () => "0", // endValue 0 — display fixed token
  },
];

const DOT_COUNT = 40;
const LINK_DIST = 110;
const MOUSE_RADIUS = 140;
const MOUSE_FORCE = 0.18;

/**
 * @param {object} props
 * @param {boolean} props.active
 * @param {{ label: string; description: string; endValue: number; formatCounter: (v: number) => string }} props.metric
 * @param {number} props.index
 */
function MetricCell({ active, metric, index }) {
  const lineRef = useRef(null);
  const decodedLabel = useDecodeText(metric.label, active, { durationMs: 820 });
  const [displayValue, setDisplayValue] = useState("\u00a0");

  useGSAP(
    () => {
      if (!active) return;

      const line = lineRef.current;
      if (line) {
        gsap.fromTo(
          line,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 0.85,
            ease: "power2.out",
            transformOrigin: "top center",
          },
        );
      }

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (metric.endValue === 0) {
        setDisplayValue("0");
        return;
      }

      if (reduceMotion) {
        setDisplayValue(metric.formatCounter(metric.endValue));
        return;
      }

      const proxy = { v: 0 };
      const tween = gsap.to(proxy, {
        v: metric.endValue,
        duration: 2.35,
        ease: "power3.out",
        delay: 0.05,
        onUpdate: () => {
          setDisplayValue(metric.formatCounter(proxy.v));
        },
        onComplete: () => {
          setDisplayValue(metric.formatCounter(metric.endValue));
        },
      });

      return () => {
        tween.kill();
      };
    },
    { dependencies: [active, metric] },
  );

  return (
    <div className="relative flex flex-col gap-3 px-4 py-8 md:px-6 lg:px-8">
      {index > 0 ? (
        <div
          className="pointer-events-none absolute bottom-0 left-0 top-0 z-0 hidden w-px overflow-hidden lg:block"
          aria-hidden
        >
          <div
            ref={lineRef}
            className="h-full w-full origin-top scale-y-0 bg-[hsl(var(--color-text-primary)/0.12)]"
          />
        </div>
      ) : null}

      <p className="relative z-10 min-h-[1.25rem] font-mono text-sm font-medium uppercase tracking-widest text-[hsl(var(--color-accent))]">
        {decodedLabel || "\u00a0"}
      </p>
      <p className="relative z-10 text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-[hsl(var(--color-text-primary))] to-[hsl(var(--color-text-primary)/0.5)]">
        {displayValue}
      </p>
      <p className="relative z-10 max-w-xs text-sm leading-relaxed text-[hsl(var(--color-text-secondary))]">
        {metric.description}
      </p>
    </div>
  );
}

export function MetricsSection() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [activeMask, setActiveMask] = useState(0);
  const reduceMotionRef = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return () => {};

    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {};

    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    /** @type {{ x: number; y: number; bx: number; by: number; vx: number; vy: number }[]} */
    const dots = Array.from({ length: DOT_COUNT }, () => {
      const x = Math.random() * section.clientWidth;
      const y = Math.random() * section.clientHeight;
      return { x, y, bx: x, by: y, vx: 0, vy: 0 };
    });

    let mouseX = -9999;
    let mouseY = -9999;
    let mouseInside = false;

    const onMove = (e) => {
      const r = section.getBoundingClientRect();
      mouseInside =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
    };

    const onLeave = () => {
      mouseInside = false;
    };

    const resize = () => {
      const w = section.clientWidth;
      const h = section.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(section);

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);

    const draw = () => {
      const w = section.clientWidth;
      const h = section.clientHeight;

      ctx.clearRect(0, 0, w, h);

      const rm = reduceMotionRef.current;

      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        if (!rm && mouseInside) {
          const dx = d.x - mouseX;
          const dy = d.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < MOUSE_RADIUS) {
            const f = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
            // Even indices: repel from cursor; odd: attract toward cursor
            const sign = i % 2 === 0 ? 1 : -1;
            d.vx += (dx / dist) * f * sign;
            d.vy += (dy / dist) * f * sign;
          }
        }

        d.vx += (d.bx - d.x) * 0.012;
        d.vy += (d.by - d.y) * 0.012;
        d.vx *= 0.94;
        d.vy *= 0.94;
        d.x += d.vx;
        d.y += d.vy;

        d.x = Math.max(4, Math.min(w - 4, d.x));
        d.y = Math.max(4, Math.min(h - 4, d.y));
      }

      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1;

      for (let i = 0; i < dots.length; i += 1) {
        for (let j = i + 1; j < dots.length; j += 1) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = 1 - dist / LINK_DIST;
            ctx.globalAlpha = alpha * 0.85;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      ctx.fillStyle = ACCENT;
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        ctx.beginPath();
        ctx.arc(d.x, d.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return initCanvas();
  }, [initCanvas]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top 82%",
        once: true,
        onEnter: () => {
          METRICS.forEach((_, i) => {
            gsap.delayedCall(i * 0.15, () => {
              setActiveMask((m) => m | (1 << i));
            });
          });
        },
      });

      return () => {
        st.kill();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-hidden bg-[hsl(var(--color-bg))] py-20 md:py-24"
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4 lg:gap-0">
          {METRICS.map((metric, index) => (
            <MetricCell
              key={metric.label}
              index={index}
              metric={metric}
              active={((activeMask >> index) & 1) === 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsSection;
