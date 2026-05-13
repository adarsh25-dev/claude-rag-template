"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileText, MessageSquare, PanelRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const USER_MSG = "What does the warranty cover?";

const DOCS = [
  { name: "warranty.pdf" },
  { name: "return-policy.md" },
  { name: "product-specs.pdf" },
];

const SOURCE_SNIPPETS = [
  {
    title: "warranty.pdf · §3.1",
    text: "…manufacturing defects for a period of twenty-four (24) months from the original purchase date…",
    highlight: "twenty-four (24) months",
  },
  {
    title: "warranty.pdf · §3.2",
    text: "…excludes cosmetic damage, unauthorized repairs, and damage caused by improper installation…",
    highlight: "excludes cosmetic damage",
  },
  {
    title: "warranty.pdf · cover",
    text: "…coverage is limited to repair or replacement at the manufacturer’s sole discretion…",
    highlight: "repair or replacement",
  },
];

/**
 * @param {object} props
 * @param {string} props.text
 * @param {string} props.highlight
 */
function HighlightedSnippet({ text, highlight }) {
  const parts = text.split(highlight);
  if (parts.length === 1) {
    return <span className="text-[11px] leading-relaxed text-[hsl(var(--color-text-secondary))]">{text}</span>;
  }
  return (
    <span className="text-[11px] leading-relaxed text-[hsl(var(--color-text-secondary))]">
      {parts[0]}
      <mark className="rounded-sm bg-amber-300/35 px-0.5 text-[hsl(var(--color-text-primary))]">
        {highlight}
      </mark>
      {parts[1]}
    </span>
  );
}

export function PlaygroundPreview() {
  const sectionRef = useRef(null);
  const floatWrapRef = useRef(null);
  const scrollShellRef = useRef(null);
  const tiltInnerRef = useRef(null);
  const userBubbleRef = useRef(null);
  const typingRef = useRef(null);
  const assistantRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const floatTweenRef = useRef(null);

  const onMouseMove = useCallback((e) => {
    const shell = scrollShellRef.current;
    const tilt = tiltInnerRef.current;
    if (!shell || !tilt) return;
    const r = shell.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(tilt, {
      rotateY: px * 7,
      rotateX: -py * 5,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    gsap.to(tiltInnerRef.current, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.5,
      ease: "power2.out",
    });
  }, []);

  useEffect(() => {
    const wrap = floatWrapRef.current;
    if (!wrap || typeof document === "undefined") return undefined;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return undefined;

    const tw = gsap.to(wrap, {
      y: 10,
      repeat: -1,
      yoyo: true,
      duration: 4,
      ease: "sine.inOut",
    });
    floatTweenRef.current = tw;

    return () => {
      tw.kill();
      floatTweenRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tw = floatTweenRef.current;
    if (!tw) return;
    if (hovering) tw.pause();
    else tw.resume();
  }, [hovering]);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const shell = scrollShellRef.current;
      const userEl = userBubbleRef.current;
      const typingEl = typingRef.current;
      const botEl = assistantRef.current;
      if (!section || !shell) return undefined;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        gsap.set(shell, { scale: 1, opacity: 1, rotateX: 0 });
        if (userEl) gsap.set(userEl, { opacity: 1, y: 0 });
        if (typingEl) gsap.set(typingEl, { opacity: 0 });
        if (botEl) gsap.set(botEl, { opacity: 1, y: 0 });
        return undefined;
      }

      gsap.set(shell, {
        scale: 0.8,
        opacity: 0,
        rotateX: 20,
        transformOrigin: "50% 50%",
        transformPerspective: 1200,
      });
      if (userEl) gsap.set(userEl, { opacity: 0, y: 14 });
      if (typingEl) gsap.set(typingEl, { opacity: 0 });
      if (botEl) gsap.set(botEl, { opacity: 0, y: 14 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 72%",
          end: "+=115%",
          scrub: 1,
        },
      });

      tl.to(
        shell,
        {
          scale: 1,
          opacity: 1,
          rotateX: 0,
          ease: "power2.out",
          duration: 0.28,
        },
        0,
      );

      if (userEl) {
        tl.to(
          userEl,
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.18 },
          0.22,
        );
      }

      if (typingEl) {
        tl.to(typingEl, { opacity: 1, ease: "none", duration: 0.12 }, 0.42);
        tl.to(typingEl, { opacity: 0, ease: "none", duration: 0.08 }, 0.58);
      }

      if (botEl) {
        tl.to(
          botEl,
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.22 },
          0.56,
        );
      }

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="demo"
      className="relative px-6 py-32"
      aria-labelledby="playground-preview-heading"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes playground-typing-dot {
              0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
              40% { transform: translateY(-4px); opacity: 1; }
            }
            @keyframes playground-hotspot-pulse {
              0% { transform: scale(0.85); opacity: 0.65; }
              70% { transform: scale(2.4); opacity: 0; }
              100% { transform: scale(2.4); opacity: 0; }
            }
            .playground-typing-dot:nth-child(1) { animation: playground-typing-dot 1s ease-in-out infinite; animation-delay: 0s; }
            .playground-typing-dot:nth-child(2) { animation: playground-typing-dot 1s ease-in-out infinite; animation-delay: 0.15s; }
            .playground-typing-dot:nth-child(3) { animation: playground-typing-dot 1s ease-in-out infinite; animation-delay: 0.3s; }
            .playground-hotspot::before {
              content: "";
              position: absolute;
              inset: -4px;
              border-radius: 9999px;
              border: 1px solid rgb(206 168 92 / 0.45);
              animation: playground-hotspot-pulse 2.2s ease-out infinite;
              animation-delay: var(--ring-delay, 0s);
            }
            @media (prefers-reduced-motion: reduce) {
              .playground-typing-dot { animation: none !important; opacity: 0.5; }
              .playground-hotspot::before { animation: none !important; opacity: 0.35; }
            }
          `,
        }}
      />

      <div className="mx-auto max-w-5xl">
        <p className="mb-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--color-text-tertiary))]">
          Live preview
        </p>
        <h2
          id="playground-preview-heading"
          className="mb-12 text-center font-display text-2xl tracking-tight text-[hsl(var(--color-text-primary))] sm:text-3xl"
        >
          Build in the browser. Ship for real.
        </h2>

        <div
          ref={floatWrapRef}
          className="will-change-transform"
          style={{ transform: "translateY(0px)" }}
        >
          <div
            className="[perspective:1200px]"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => {
              setHovering(false);
              onMouseLeave();
            }}
            onMouseMove={onMouseMove}
          >
            <div
              ref={scrollShellRef}
              className="mx-auto overflow-hidden rounded-xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))] shadow-[0_24px_80px_-20px_rgb(0_0_0/0.55)] will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                ref={tiltInnerRef}
                className="will-change-transform"
                style={{ transformStyle: "preserve-3d" }}
              >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] px-3 py-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-full bg-[hsl(var(--color-danger))]"
                  aria-hidden
                />
                <span
                  className="size-2.5 shrink-0 rounded-full bg-[hsl(var(--color-warning))]"
                  aria-hidden
                />
                <span
                  className="size-2.5 shrink-0 rounded-full bg-[hsl(var(--color-success))]"
                  aria-hidden
                />
                <div className="ml-2 flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg))] px-2 py-1">
                  <span className="truncate text-[11px] text-[hsl(var(--color-text-tertiary))]">
                    https://playground.local/rag-studio
                  </span>
                </div>
              </div>

              {/* Fake app */}
              <div className="flex min-h-[320px] flex-col md:min-h-[380px] md:flex-row">
                {/* Sidebar */}
                <aside className="flex w-full shrink-0 flex-col border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg))] md:w-[200px] md:border-r">
                  <div className="border-b border-[hsl(var(--color-border))] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--color-text-tertiary))]">
                    Library
                  </div>
                  <ul className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:gap-0">
                    {DOCS.map((d) => (
                      <li key={d.name}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] text-[hsl(var(--color-text-secondary))] hover:bg-[hsl(var(--color-bg-hover))] md:py-1.5"
                        >
                          <FileText className="size-3.5 shrink-0 text-[hsl(var(--color-accent))]" />
                          <span className="min-w-0 truncate">{d.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>

                {/* Chat */}
                <main className="flex min-h-[200px] flex-1 flex-col border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg))] md:border-r">
                  <div className="flex items-center gap-2 border-b border-[hsl(var(--color-border))] px-3 py-2">
                    <MessageSquare className="size-3.5 text-[hsl(var(--color-text-tertiary))]" />
                    <span className="text-[11px] font-medium text-[hsl(var(--color-text-secondary))]">
                      Warranty assistant
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-3">
                    <div ref={userBubbleRef} className="ml-auto max-w-[92%]">
                      <div className="rounded-2xl rounded-br-md border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] px-3 py-2 text-[12px] leading-snug text-[hsl(var(--color-text-primary))]">
                        {USER_MSG}
                      </div>
                    </div>

                    <div ref={typingRef} className="flex max-w-[92%] items-end gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-elevated))] text-[10px] font-medium text-[hsl(var(--color-accent))]">
                        AI
                      </div>
                      <div className="rounded-2xl rounded-bl-md border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] px-3 py-2">
                        <div className="flex items-center gap-1 py-0.5">
                          <span className="playground-typing-dot inline-block size-1.5 rounded-full bg-[hsl(var(--color-text-secondary))]" />
                          <span className="playground-typing-dot inline-block size-1.5 rounded-full bg-[hsl(var(--color-text-secondary))]" />
                          <span className="playground-typing-dot inline-block size-1.5 rounded-full bg-[hsl(var(--color-text-secondary))]" />
                        </div>
                      </div>
                    </div>

                    <div ref={assistantRef} className="flex max-w-[95%] items-start gap-2">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-elevated))] text-[10px] font-medium text-[hsl(var(--color-accent))]">
                        AI
                      </div>
                      <div className="rounded-2xl rounded-bl-md border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] px-3 py-2 text-[12px] leading-relaxed text-[hsl(var(--color-text-primary))]">
                        Based on Section 3.1 of{" "}
                        <code className="rounded bg-[hsl(var(--color-bg-hover))] px-1 py-0.5 font-mono text-[11px] text-[hsl(var(--color-accent))]">
                          warranty.pdf
                        </code>
                        , the coverage includes manufacturing defects for 24
                        months from the purchase date. Normal wear, misuse, and
                        third-party modifications are excluded.
                      </div>
                    </div>
                  </div>
                </main>

                {/* Sources */}
                <aside className="relative w-full shrink-0 border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg))] md:w-[220px] md:border-l">
                  <div className="flex items-center gap-2 border-b border-[hsl(var(--color-border))] px-3 py-2">
                    <PanelRight className="size-3.5 text-[hsl(var(--color-text-tertiary))]" />
                    <span className="text-[11px] font-medium text-[hsl(var(--color-text-secondary))]">
                      Sources
                    </span>
                  </div>
                  <div className="space-y-3 p-2">
                    {SOURCE_SNIPPETS.map((snip, i) => (
                      <div
                        key={snip.title}
                        className="relative rounded-lg border border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg-overlay))] p-2 pr-6"
                      >
                        <div
                          className="playground-hotspot pointer-events-none absolute right-2 top-2 size-2 rounded-full bg-amber-400/90 shadow-[0_0_12px_rgb(251_191_36/0.45)]"
                          style={{ "--ring-delay": `${i * 0.35}s` }}
                        />
                        <p className="mb-1 text-[10px] font-medium text-[hsl(var(--color-text-tertiary))]">
                          {snip.title}
                        </p>
                        <HighlightedSnippet
                          text={snip.text}
                          highlight={snip.highlight}
                        />
                      </div>
                    ))}
                  </div>
                </aside>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
