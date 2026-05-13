"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Boxes,
  Layers,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    title: "Ingest",
    description:
      "Drop your docs. PDF, Markdown, Notion exports—we take everything.",
    Icon: Upload,
  },
  {
    title: "Parse & Chunk",
    description:
      "Smart semantic splitting preserves context, not just characters.",
    Icon: Layers,
  },
  {
    title: "Vectorize",
    description:
      "Embed into a high-dimensional search space in milliseconds.",
    Icon: Boxes,
  },
  {
    title: "Retrieve",
    description: "Fetch the exact context needed to answer any question.",
    Icon: Search,
  },
  {
    title: "Generate",
    description:
      "Your RAG app returns grounded, hallucination-resistant answers.",
    Icon: Sparkles,
  },
];

/**
 * Pinned (desktop) pipeline walkthrough with scroll-scrubbed path, packet, and node highlights.
 */
export function PipelineSection() {
  const rootRef = useRef(null);
  const pinRef = useRef(null);
  const svgRef = useRef(null);
  const pathRef = useRef(null);
  const packetRef = useRef(null);
  const nodeRefs = useRef([]);

  useGSAP(
    () => {
      const root = rootRef.current;
      const pin = pinRef.current;
      const svg = svgRef.current;
      const path = pathRef.current;
      const packet = packetRef.current;
      if (!root || !pin) return;

      const cards = () =>
        nodeRefs.current
          .filter(Boolean)
          .map((n) => n.querySelector(".pipeline-card"))
          .filter(Boolean);

      let pathLength = 0;

      const rebuildPath = () => {
        if (!svg || !path || !pin) return 0;
        const w = pin.clientWidth;
        const h = pin.clientHeight;
        if (w < 2 || h < 2) return 0;

        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));

        const pinRect = pin.getBoundingClientRect();
        const pts = nodeRefs.current
          .filter(Boolean)
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              x: r.left + r.width / 2 - pinRect.left,
              y: r.top + r.height / 2 - pinRect.top,
            };
          });

        if (pts.length < 2) return 0;

        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i += 1) {
          d += ` L ${pts[i].x} ${pts[i].y}`;
        }
        path.setAttribute("d", d);
        pathLength = path.getTotalLength() || 0;
        path.style.strokeDasharray = String(pathLength);
        path.style.strokeDashoffset = String(pathLength);
        return pathLength;
      };

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        rebuildPath();

        const run = () => {
          rebuildPath();
          ScrollTrigger.refresh();
        };

        requestAnimationFrame(run);
        window.addEventListener("resize", run);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            onRefresh: rebuildPath,
            onUpdate: (self) => {
              const p = self.progress;
              if (!path || pathLength <= 0) return;

              const drawStart = 0.22;
              const drawP = gsap.utils.clamp(
                0,
                1,
                (p - drawStart) / Math.max(0.001, 1 - drawStart),
              );

              path.style.strokeDashoffset = String(pathLength * (1 - drawP));

              if (packet && pathLength > 0) {
                const pt = path.getPointAtLength(pathLength * drawP);
                gsap.set(packet, {
                  left: pt.x,
                  top: pt.y,
                  xPercent: -50,
                  yPercent: -50,
                  opacity: drawP > 0.02 ? 1 : 0,
                });
              }

              const active = Math.min(
                STEPS.length - 1,
                Math.floor(drawP * STEPS.length),
              );
              nodeRefs.current.forEach((node, i) => {
                if (!node) return;
                const on = i === active;
                node.dataset.active = on ? "true" : "false";
              });
            },
          },
        });

        const cardEls = cards();
        if (cardEls.length > 0) {
          tl.from(
            cardEls,
            {
              y: 50,
              opacity: 0,
              stagger: 0.2,
              duration: 0.28,
              ease: "power2.out",
            },
            0,
          );
        }

        return () => {
          window.removeEventListener("resize", run);
          tl.kill();
        };
      });

      mm.add("(max-width: 767px)", () => {
        const c = cards();
        if (c.length === 0) {
          return () => {};
        }

        const tween = gsap.from(c, {
          y: 50,
          opacity: 0,
          stagger: 0.2,
          duration: 0.55,
          ease: "power2.out",
          scrollTrigger: {
            trigger: root,
            start: "top 78%",
            once: true,
          },
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .pipeline-node[data-active="true"] .pipeline-card {
          transform: scale(1.05);
          border-color: rgb(129 140 249 / 0.5);
          box-shadow: 0 0 0 1px rgb(129 140 249 / 0.12), 0 18px 48px -12px rgb(0 0 0 / 0.45);
        }
        .pipeline-node::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: inherit;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(
            circle at 50% 50%,
            rgb(129 140 249 / 0.22) 0%,
            rgb(139 92 246 / 0.08) 35%,
            transparent 65%
          );
          transform: scale(0.85);
          transition: opacity 0.35s ease, transform 0.35s ease;
          z-index: -1;
        }
        .pipeline-node[data-active="true"]::after {
          opacity: 1;
          transform: scale(1.15);
          animation: pipeline-pulse 1.35s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pipeline-node[data-active="true"]::after {
            animation: none;
          }
        }
        @keyframes pipeline-pulse {
          0% { transform: scale(1); opacity: 0.55; }
          70% { transform: scale(1.45); opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      ` }} />

      <section
        ref={rootRef}
        id="how"
        className="relative w-full md:min-h-0"
        aria-labelledby="pipeline-heading"
      >
        <h2 id="pipeline-heading" className="sr-only">
          RAG pipeline
        </h2>

        <div
          ref={pinRef}
          className="relative flex min-h-[100svh] w-full flex-col md:h-screen md:min-h-0"
        >
          {/* Dim ParticleShaderBackground / page backdrop */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-[hsl(var(--color-bg)/0.55)]"
            aria-hidden
          />

          <svg
            ref={svgRef}
            className="pointer-events-none absolute inset-0 z-[1] hidden h-full w-full md:block"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              ref={pathRef}
              fill="none"
              stroke="rgb(129 140 249 / 0.45)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              d="M 0 0 L 0 0"
            />
          </svg>

          <div
            ref={packetRef}
            className="pointer-events-none absolute left-0 top-0 z-[2] hidden size-4 rounded-full md:block"
            style={{
              willChange: "transform, opacity",
              boxShadow:
                "0 0 22px 6px rgb(129 140 249 / 0.55), 0 0 48px 18px rgb(139 92 246 / 0.28)",
              filter: "blur(0.45px)",
              background:
                "radial-gradient(circle, rgb(255 255 255 / 0.92) 0%, rgb(165 180 252 / 0.45) 42%, transparent 72%)",
            }}
            aria-hidden
          />

          <div className="relative z-[3] mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-14 md:py-10">
            <div className="mb-10 text-center md:mb-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[hsl(var(--color-text-tertiary))]">
                End-to-end
              </p>
              <p className="mt-2 font-display text-2xl tracking-tight text-[hsl(var(--color-text-primary))] sm:text-3xl">
                From file to grounded answer
              </p>
            </div>

            <div className="grid auto-rows-auto grid-cols-1 gap-y-12 md:grid-cols-2 md:gap-x-10 md:gap-y-10">
              {STEPS.map((step, i) => {
                const Icon = step.Icon;
                const col = i % 2 === 0 ? "md:col-start-1" : "md:col-start-2";
                const align =
                  i % 2 === 0
                    ? "md:justify-self-end md:text-right"
                    : "md:justify-self-start md:text-left";
                return (
                  <div
                    key={step.title}
                    ref={(el) => {
                      nodeRefs.current[i] = el;
                    }}
                    className={`pipeline-node relative max-w-sm rounded-2xl ${col} ${align}`}
                    style={{ gridRow: i + 1 }}
                    data-active="false"
                  >
                    <div
                      className="pipeline-card relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-none backdrop-blur-md transition-[transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform"
                    >
                      <div
                        className={`mb-3 flex items-center gap-3 ${
                          i % 2 === 0
                            ? "md:flex-row-reverse"
                            : ""
                        }`}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[hsl(var(--color-accent)/0.9)]">
                          <Icon className="size-5" strokeWidth={1.5} />
                        </span>
                        <h3 className="font-display text-lg text-[hsl(var(--color-text-primary))]">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed text-[hsl(var(--color-text-secondary))]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
