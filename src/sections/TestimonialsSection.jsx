"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CARD_W = 400;
const GAP = 24;

/** @type {const} */
const TESTIMONIALS = [
  {
    quote:
      "We shipped grounded answers in a week. Retrieval latency feels instant next to our old stack.",
    name: "Jordan Lee",
    title: "Principal Engineer, Platform",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop",
    videoSrc: undefined,
    poster: undefined,
  },
  {
    quote:
      "Doc teams finally trust the assistant—it cites every claim. That alone paid for the migration.",
    name: "Sam Rivera",
    title: "Head of Technical Writing",
    avatar:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&h=128&fit=crop",
    videoSrc: undefined,
    poster: undefined,
  },
  {
    quote:
      "The vector pipeline just works. We indexed millions of chunks without babysitting infra.",
    name: "Avery Chen",
    title: "ML Lead",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop",
    videoSrc: undefined,
    poster: undefined,
  },
  {
    quote:
      "Our compliance reviewers love the source cards. RAG went from experiment to default interface.",
    name: "Morgan Patel",
    title: "Security Architect",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop",
    videoSrc: undefined,
    poster: undefined,
  },
  {
    quote:
      "We replaced three glue scripts with one ingestion path. Support load dropped noticeably.",
    name: "Riley Ortiz",
    title: "Developer Experience",
    avatar:
      "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=128&h=128&fit=crop",
    videoSrc: undefined,
    poster: undefined,
  },
  {
    quote:
      "Pinned docs + live retrieval in one surface. Our PMs stopped asking for screenshots of answers.",
    name: "Casey Nguyen",
    title: "Product Ops",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop",
    videoSrc:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    poster:
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop",
  },
];

function StarRow() {
  const stars = Array.from({ length: 5 }, (_, i) => (
    <svg
      key={i}
      className="h-4 w-4 shrink-0 text-[hsl(var(--color-accent))]"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ));
  return (
    <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
      {stars}
    </div>
  );
}

/**
 * @param {object} props
 * @param {(typeof TESTIMONIALS)[number]} props.item
 * @param {(el: HTMLDivElement | null) => void} props.setInner3dEl
 * @param {(el: HTMLVideoElement | null) => void} props.setVideoEl
 * @param {() => void} props.onHoverPlay
 * @param {() => void} props.onHoverStop
 */
function TestimonialCard({
  item,
  setInner3dEl,
  setVideoEl,
  onHoverPlay,
  onHoverStop,
}) {
  return (
    <div
      data-t-card
      className="group/card relative shrink-0"
      style={{ width: CARD_W }}
      onMouseEnter={onHoverPlay}
      onMouseLeave={onHoverStop}
    >
      <div
        ref={setInner3dEl}
        className="[transform-style:preserve-3d] will-change-transform"
      >
        <div
          className="flex h-full flex-col gap-5 rounded-2xl border border-white/10 bg-[hsl(var(--color-bg-elevated)/0.32)] p-8 shadow-lg backdrop-blur-md transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/card:-translate-y-[10px] group-hover/card:border-white/25"
          style={{ transformStyle: "preserve-3d" }}
        >
          <div className="flex items-start gap-4">
          {item.videoSrc ? (
            <div className="relative shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--color-accent))]/80 to-[hsl(var(--color-accent-2))]/80 p-[2px]">
              <video
                ref={setVideoEl}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[hsl(var(--color-bg))]"
                poster={item.poster}
                muted
                playsInline
                loop
                preload="none"
              >
                <source src={item.videoSrc} type="video/mp4" />
              </video>
            </div>
          ) : (
            <div className="shrink-0 rounded-full bg-gradient-to-br from-[hsl(var(--color-accent))]/70 to-[hsl(var(--color-accent-2))]/70 p-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote demo avatars */}
              <img
                src={item.avatar ?? ""}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[hsl(var(--color-bg))]"
              />
            </div>
          )}
          <StarRow />
          </div>

          <blockquote className="text-lg italic leading-relaxed text-[hsl(var(--color-text-primary))] md:text-xl">
            “{item.quote}”
          </blockquote>

          <div className="mt-auto border-t border-white/[0.06] pt-4">
            <p className="font-medium text-[hsl(var(--color-text-primary))]">
              {item.name}
            </p>
            <p className="text-sm text-[hsl(var(--color-text-secondary))]">
              {item.title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const scrollXRef = useRef(0);
  const dragExtraRef = useRef(0);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, extra: 0 });
  const inner3dElsRef = useRef(/** @type {(HTMLDivElement | null)[]} */ ([]));
  const videoRefsRef = useRef(/** @type {(HTMLVideoElement | null)[]} */ ([]));
  const maxScrollRef = useRef(0);
  const scrollStRef = useRef(/** @type {ScrollTrigger | null} */ (null));
  const activePointerIdRef = useRef(/** @type {number | null} */ (null));

  const updateCard3D = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      inner3dElsRef.current.forEach((el) => {
        if (!el) return;
        gsap.set(el, { clearProps: "transform,filter,opacity" });
      });
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const view = stage.getBoundingClientRect();
    const center = view.left + view.width / 2;

    inner3dElsRef.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const blend = Math.max(
        -1,
        Math.min(1, (cx - center) / (view.width * 0.32)),
      );

      const rotateY = blend * -42;
      const translateZ = -50 - Math.abs(blend) * 55;
      const scale = 1 - Math.abs(blend) * 0.12;
      const opacity = 1 - Math.abs(blend) * 0.4;
      const blurPx = Math.abs(blend) > 0.22 ? 1 : 0;

      gsap.set(el, {
        rotateY,
        z: translateZ,
        scale,
        opacity: Math.max(0.55, opacity),
        filter: blurPx > 0 ? `blur(${blurPx}px)` : "none",
        transformOrigin: "center center",
        force3D: true,
      });
    });
  }, []);

  const applyTrackX = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxS = maxScrollRef.current;
    const raw = scrollXRef.current + dragExtraRef.current;
    const clamped = Math.max(-maxS, Math.min(0, raw));
    gsap.set(track, { x: clamped, force3D: true });
    updateCard3D();
  }, [updateCard3D]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!section || !stage || !track) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const cards = gsap.utils.toArray(
        track.querySelectorAll("[data-t-card]"),
      );

      if (!reduceMotion) {
        gsap.set(cards, {
          x: 100,
          rotateY: 45,
          opacity: 0,
          transformOrigin: "center center",
          force3D: true,
        });
      }

      const enterSt = ScrollTrigger.create({
        trigger: section,
        start: "top 78%",
        once: true,
        onEnter: () => {
          if (reduceMotion) return;
          gsap.to(cards, {
            x: 0,
            rotateY: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.12,
            onUpdate: updateCard3D,
            onComplete: updateCard3D,
          });
        },
      });

      const measure = () => {
        const total =
          TESTIMONIALS.length * CARD_W + (TESTIMONIALS.length - 1) * GAP;
        const viewW = stage.clientWidth;
        maxScrollRef.current = Math.max(0, total - viewW + 48);
      };

      measure();

      let scrollSt = null;
      if (!reduceMotion) {
        scrollSt = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${Math.max(2200, maxScrollRef.current + 1400)}`,
          pin: true,
          pinSpacing: true,
          scrub: 0.85,
          anticipatePin: 1,
          onUpdate: (self) => {
            const maxS = maxScrollRef.current;
            if (!draggingRef.current) {
              scrollXRef.current = -self.progress * maxS;
            }
            applyTrackX();
          },
        });
        scrollStRef.current = scrollSt;
      } else {
        scrollStRef.current = null;
        scrollXRef.current = 0;
        dragExtraRef.current = 0;
        applyTrackX();
      }

      const ro = new ResizeObserver(() => {
        measure();
        ScrollTrigger.refresh();
        applyTrackX();
      });
      ro.observe(stage);

      const onPointerDown = (e) => {
        if (reduceMotion) return;
        if (!(e.target instanceof Element) || !stage.contains(e.target)) {
          return;
        }
        draggingRef.current = true;
        activePointerIdRef.current = e.pointerId;
        dragStartRef.current = {
          x: e.clientX,
          extra: dragExtraRef.current,
        };
        try {
          stage.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      };

      const onPointerMove = (e) => {
        if (!draggingRef.current || reduceMotion) return;
        const dx = e.clientX - dragStartRef.current.x;
        dragExtraRef.current = dragStartRef.current.extra + dx;
        applyTrackX();
      };

      const onPointerUp = () => {
        if (!draggingRef.current || reduceMotion) return;
        draggingRef.current = false;
        const pid = activePointerIdRef.current;
        activePointerIdRef.current = null;
        if (pid != null) {
          try {
            stage.releasePointerCapture(pid);
          } catch {
            /* ignore */
          }
        }

        const maxS = maxScrollRef.current;
        const combined = scrollXRef.current + dragExtraRef.current;
        const clamped = Math.max(-maxS, Math.min(0, combined));
        const st = scrollStRef.current;

        dragExtraRef.current = 0;

        if (st && maxS > 0) {
          const progress = Math.max(0, Math.min(1, -clamped / maxS));
          const targetScroll = st.start + progress * (st.end - st.start);
          st.scroll(targetScroll);
          scrollXRef.current = -st.progress * maxS;
        } else {
          scrollXRef.current = clamped;
        }

        applyTrackX();
      };

      stage.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);

      gsap.delayedCall(0.05, () => {
        measure();
        applyTrackX();
      });

      return () => {
        enterSt.kill();
        scrollSt?.kill();
        scrollStRef.current = null;
        ro.disconnect();
        stage.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };
    },
    { scope: sectionRef, dependencies: [applyTrackX, updateCard3D] },
  );

  useEffect(() => {
    const onResize = () => updateCard3D();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateCard3D]);

  return (
    <section
      ref={sectionRef}
      className="relative bg-[hsl(var(--color-bg))] py-24 motion-reduce:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <h2 className="mb-12 max-w-2xl text-left text-3xl font-semibold tracking-tight text-[hsl(var(--color-text-primary))] md:text-4xl">
          Loved by developers and doc teams.
        </h2>

        <div
          ref={stageRef}
          className="relative cursor-grab touch-pan-y overflow-x-auto overflow-y-visible py-6 active:cursor-grabbing motion-reduce:cursor-default motion-reduce:overflow-x-auto md:overflow-x-hidden md:touch-none"
          style={{ perspective: "1000px" }}
        >
          <div
            ref={trackRef}
            className="flex w-max gap-6 pl-2 will-change-transform [transform-style:preserve-3d] motion-reduce:translate-x-0"
          >
            {TESTIMONIALS.map((item, index) => (
              <TestimonialCard
                key={`${item.name}-${index}`}
                item={item}
                setInner3dEl={(el) => {
                  inner3dElsRef.current[index] = el;
                }}
                setVideoEl={(el) => {
                  videoRefsRef.current[index] = el;
                }}
                onHoverPlay={() => {
                  const v = videoRefsRef.current[index];
                  if (v && item.videoSrc) void v.play().catch(() => {});
                }}
                onHoverStop={() => {
                  const v = videoRefsRef.current[index];
                  if (v) {
                    v.pause();
                    try {
                      v.currentTime = 0;
                    } catch {
                      /* ignore */
                    }
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
