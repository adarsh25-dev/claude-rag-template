"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { FinalCTAWebGLScene } from "@/src/sections/FinalCTAWebGL";

gsap.registerPlugin(ScrollTrigger);

function canUseWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(
      c.getContext("webgl2") ||
      c.getContext("webgl") ||
      c.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function VideoBackdrop() {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const loadedRef = useRef(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!loadedRef.current) {
              loadedRef.current = true;
              v.load();
            }
            void v.play().catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { rootMargin: "80px", threshold: 0.06 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 mix-blend-screen"
        muted
        loop
        playsInline
        preload="none"
        poster="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80"
      >
        <source
          src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          type="video/mp4"
        />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_32%,hsl(var(--color-bg)/0.85)_78%,hsl(var(--color-bg))_100%)]" />
    </>
  );
}

/**
 * @param {{ href: string; children: React.ReactNode }} props
 */
function MagneticCtaButton({ href, children }) {
  const wrapRef = useRef(null);
  const glowRef = useRef(null);
  const rippleTimeoutsRef = useRef(/** @type {gsap.core.Tween[]} */ ([]));
  const [ripples, setRipples] = useState(
    /** @type {{ id: number; x: number; y: number }[]} */ ([]),
  );

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const glow = glowRef.current;
    return () => {
      rippleTimeoutsRef.current.forEach((t) => t.kill());
      rippleTimeoutsRef.current = [];
      if (wrap) gsap.killTweensOf(wrap);
      if (glow) gsap.killTweensOf(glow);
    };
  }, []);

  const onMove = useCallback((e) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pull = Math.min(dist * 0.18, 20);
    const ox = (dx / dist) * pull;
    const oy = (dy / dist) * pull;
    gsap.to(el, {
      x: ox,
      y: oy,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
      overwrite: "auto",
    });
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 1,
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      });
    }
  }, []);

  const onLeave = useCallback(() => {
    const el = wrapRef.current;
    if (el) {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      });
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0,
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      });
    }
  }, []);

  const onClick = useCallback((e) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const id = Date.now();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples((r) => [...r, { id, x, y }]);
    const dc = gsap.delayedCall(0.85, () => {
      setRipples((r) => r.filter((item) => item.id !== id));
    });
    rippleTimeoutsRef.current.push(dc);
  }, []);

  return (
    <div className="relative mt-10 flex justify-center">
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_50%_50%,hsl(var(--color-accent-glow))_0%,transparent_62%)] opacity-0 blur-xl"
        aria-hidden
      />
      <div ref={wrapRef} className="relative inline-block will-change-transform">
        <Link
          href={href}
          className="relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--color-text-primary))] px-8 py-4 text-lg font-bold text-[hsl(var(--color-bg))] shadow-[0_0_60px_hsl(var(--color-accent-glow))] transition-shadow hover:shadow-[0_0_80px_hsl(var(--color-accent-glow))] motion-reduce:transition-none"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={onClick}
        >
          {ripples.map((r) => (
            <RippleBurst key={r.id} x={r.x} y={r.y} />
          ))}
          <span className="relative z-10">{children}</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * @param {{ x: number; y: number }} props
 */
function RippleBurst({ x, y }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0, opacity: 0.45 },
      {
        scale: 14,
        opacity: 0,
        duration: 0.85,
        ease: [0.16, 1, 0.3, 1],
      },
    );
  }, [x, y]);
  return (
    <span
      ref={ref}
      className="pointer-events-none absolute left-0 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--color-text-primary)/0.28)] bg-[hsl(var(--color-text-primary)/0.12)]"
      style={{ left: x, top: y }}
      aria-hidden
    />
  );
}

export function FinalCTASection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const [useVideoLayer, setUseVideoLayer] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setUseVideoLayer(!canUseWebGL());
  }, []);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const title = titleRef.current;
      if (!section || !title || reduceMotion) return;

      const tween = gsap.fromTo(
        title,
        { scale: 0.9, letterSpacing: "0.1em" },
        {
          scale: 1,
          letterSpacing: "-0.02em",
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            end: "top 28%",
            scrub: 1,
          },
        },
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: sectionRef, dependencies: [reduceMotion] },
  );

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[hsl(var(--color-bg))] px-6 py-16"
    >
        <div className="pointer-events-none absolute inset-0 z-0">
          {!reduceMotion && !useVideoLayer ? (
            <div className="absolute inset-0">
              <Canvas
                className="h-full w-full"
                dpr={[1, 2]}
                gl={{ alpha: true, antialias: true }}
                camera={{ position: [0, 0, 5.2], fov: 42 }}
              >
                <FinalCTAWebGLScene />
              </Canvas>
            </div>
          ) : null}

          {(useVideoLayer || reduceMotion) && (
            <div className="absolute inset-0">
              <VideoBackdrop />
            </div>
          )}

          {!reduceMotion && !useVideoLayer ? (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_38%,hsl(var(--color-bg))_92%,hsl(var(--color-bg))_100%)]" />
          ) : (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_28%,hsl(var(--color-bg)/0.92)_82%,hsl(var(--color-bg))_100%)]" />
          )}
        </div>

        <div className="relative z-10 flex max-w-4xl flex-col items-center text-center">
          <h2
            ref={titleRef}
            className="max-w-[18ch] font-black leading-[1.05] text-[hsl(var(--color-text-primary))] motion-reduce:scale-100 motion-reduce:tracking-tight"
            style={
              reduceMotion
                ? {
                    fontSize: "clamp(3rem, 10vw, 8rem)",
                    textShadow: "0 0 80px hsla(206, 48%, 58%, 0.32)",
                    letterSpacing: "-0.02em",
                  }
                : {
                    fontSize: "clamp(3rem, 10vw, 8rem)",
                    textShadow: "0 0 80px hsla(206, 48%, 58%, 0.32)",
                  }
            }
          >
            Build your RAG app today.
          </h2>

          <MagneticCtaButton href="/signup">
            Start Building for Free
          </MagneticCtaButton>
        </div>
      </section>
  );
}

export default FinalCTASection;
