"use client";

import { useEffect, useRef } from "react";

type ComposerWaveBackdropProps = {
  active: boolean;
  reduceMotion: boolean;
};

const TAU = Math.PI * 2;

/** Eight aurora ribbons: evenly spaced centerlines (fractions of canvas height). */
const AURORA_WAVE_Y_FIRST = 0.45;
const AURORA_WAVE_Y_LAST = 0.925;

function auroraWaveBaseY(h: number, index: number): number {
  const step = (AURORA_WAVE_Y_LAST - AURORA_WAVE_Y_FIRST) / 7;
  return h * (AURORA_WAVE_Y_FIRST + index * step);
}

/** Shared geometry for all eight ribbons (height fractions use `h * … * p`). */
const AURORA_WAVE_AMP_H = 0.055;
const AURORA_WAVE_THICKNESS_H = 0.082;
const AURORA_WAVE_PEAK = 0.105;

/** Per-ribbon motion so waves are not synchronized (freq × width, speed, offsets). */
type AuroraRibbonMotion = {
  freq: number;
  phaseSpeed: number;
  spatialPhase: number;
  lowerPhaseMul: number;
  lowerSpatial: number;
  /** Shadow blur as a fraction of canvas height (each wave has its own glow size). */
  glowBlurH: number;
  /** Shadow color alpha (0–1); applied to `innerTriplet` for the halo (not multiplied by `peak`). */
  glowAlpha: number;
};

const AURORA_WAVE_MOTIONS: readonly AuroraRibbonMotion[] = [
  {
    freq: 0.00415,
    phaseSpeed: 0.58,
    spatialPhase: 0,
    lowerPhaseMul: 1.04,
    lowerSpatial: 0.38,
    glowBlurH: 0.095,
    glowAlpha: 0.58,
  },
  {
    freq: 0.00325,
    phaseSpeed: -0.46,
    spatialPhase: 2.15,
    lowerPhaseMul: 1.09,
    lowerSpatial: 0.12,
    glowBlurH: 0.082,
    glowAlpha: 0.5,
  },
  {
    freq: 0.0054,
    phaseSpeed: 0.74,
    spatialPhase: 4.4,
    lowerPhaseMul: 0.98,
    lowerSpatial: 0.52,
    glowBlurH: 0.108,
    glowAlpha: 0.62,
  },
  {
    freq: 0.00385,
    phaseSpeed: 0.41,
    spatialPhase: 1.05,
    lowerPhaseMul: 1.06,
    lowerSpatial: 0.29,
    glowBlurH: 0.088,
    glowAlpha: 0.52,
  },
  {
    freq: 0.0049,
    phaseSpeed: -0.63,
    spatialPhase: 3.65,
    lowerPhaseMul: 1.01,
    lowerSpatial: 0.07,
    glowBlurH: 0.102,
    glowAlpha: 0.56,
  },
  {
    freq: 0.00292,
    phaseSpeed: 0.36,
    spatialPhase: 5.5,
    lowerPhaseMul: 1.12,
    lowerSpatial: 0.58,
    glowBlurH: 0.078,
    glowAlpha: 0.46,
  },
  {
    freq: 0.00505,
    phaseSpeed: -0.39,
    spatialPhase: 2.78,
    lowerPhaseMul: 0.96,
    lowerSpatial: 0.21,
    glowBlurH: 0.112,
    glowAlpha: 0.64,
  },
  {
    freq: 0.00438,
    phaseSpeed: 0.67,
    spatialPhase: 6.2,
    lowerPhaseMul: 1.03,
    lowerSpatial: 0.44,
    glowBlurH: 0.092,
    glowAlpha: 0.54,
  },
];

function readCssHslTriplet(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return fallback;
  const hslWrapped = raw.match(/^hsl\(\s*([^)]+)\s*\)$/i);
  const triplet = hslWrapped ? hslWrapped[1].trim() : raw;
  return triplet.length > 0 ? triplet : fallback;
}

function hsla(triplet: string, alpha: number): string {
  return `hsl(${triplet} / ${alpha})`;
}

function fillBlob(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  r: number,
  triplet: string,
  peak: number,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, hsla(triplet, peak));
  g.addColorStop(0.32, hsla(triplet, peak * 0.48));
  g.addColorStop(0.65, hsla(triplet, peak * 0.15));
  g.addColorStop(1, hsla(triplet, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Flowing curtain between two sine-offset edges (aurora ribbon). */
function fillAuroraRibbon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  baseY: number,
  amp: number,
  motion: AuroraRibbonMotion,
  thickness: number,
  innerTriplet: string,
  outerTriplet: string,
  peak: number,
) {
  const {
    freq,
    phaseSpeed,
    spatialPhase,
    lowerPhaseMul,
    lowerSpatial,
    glowBlurH,
    glowAlpha,
  } = motion;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y =
      baseY +
      amp *
        Math.sin(x * freq * TAU + t * phaseSpeed + spatialPhase);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let x = w; x >= 0; x -= 2) {
    const y =
      baseY +
      thickness +
      amp *
        0.92 *
        Math.sin(
          x * freq * TAU +
            t * phaseSpeed * lowerPhaseMul +
            lowerSpatial,
        );
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g0 = baseY - amp - 8;
  const g1 = baseY + thickness + amp + 24;
  const g = ctx.createLinearGradient(0, g0, 0, g1);
  g.addColorStop(0, hsla(outerTriplet, 0));
  g.addColorStop(0.25, hsla(innerTriplet, peak * 0.35));
  g.addColorStop(0.5, hsla(innerTriplet, peak * 0.85));
  g.addColorStop(0.72, hsla(outerTriplet, peak * 0.45));
  g.addColorStop(1, hsla(outerTriplet, 0));
  ctx.fillStyle = g;
  ctx.save();
  const shadowA = Math.min(0.82, glowAlpha);
  ctx.shadowBlur = Math.max(28, h * glowBlurH);
  ctx.shadowColor = hsla(innerTriplet, shadowA);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fill();
  ctx.restore();
}

export function ComposerWaveBackdrop({
  reduceMotion,
}: ComposerWaveBackdropProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const phaseRef = useRef(0);
  const lastRef = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const wi = Math.max(1, Math.floor(wrap.clientWidth));
      const hi = Math.max(1, Math.floor(wrap.clientHeight));
      canvas.width = Math.floor(wi * dpr);
      canvas.height = Math.floor(hi * dpr);
      canvas.style.width = `${wi}px`;
      canvas.style.height = `${hi}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(wrap);
    resize();

    const accent = () => readCssHslTriplet("--color-accent", "42 47% 59%");
    const accent2 = () => readCssHslTriplet("--color-accent-2", "0 41% 39%");
    const success = () => readCssHslTriplet("--color-success", "95 18% 52%");
    const textPrimary = () =>
      readCssHslTriplet("--color-text-primary", "36 38% 88%");

    const tick = (now: number) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      const speed = 0.42;
      phaseRef.current += dt * speed;

      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 1 || h < 1) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = phaseRef.current;
      const a = accent();
      const a2 = accent2();
      const sg = success();
      const tp = textPrimary();

      ctx.clearRect(0, 0, w, h);

      const p = 1;
      const ribbonAmp = h * AURORA_WAVE_AMP_H * p;
      const ribbonThickness = h * AURORA_WAVE_THICKNESS_H * p;

      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 0),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[0],
        ribbonThickness,
        sg,
        a,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 1),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[1],
        ribbonThickness,
        a,
        tp,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 2),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[2],
        ribbonThickness,
        sg,
        a2,
        AURORA_WAVE_PEAK,
      );

      fillBlob(
        ctx,
        w,
        h,
        w * (0.35 + 0.2 * Math.sin(t * 0.35 + 0.2)),
        h * (0.57 + 0.05 * Math.sin(t * 0.41)),
        h * 0.95 * p,
        sg,
        0.1,
      );
      fillBlob(
        ctx,
        w,
        h,
        w * (0.68 + 0.18 * Math.sin(t * 0.29 + 1.7)),
        h * (0.67 + 0.04 * Math.sin(t * 0.36 + 2.1)),
        h * 0.88 * p,
        a,
        0.075,
      );
      fillBlob(
        ctx,
        w,
        h,
        w * (0.52 + 0.14 * Math.sin(t * 0.24 + 3.0)),
        h * (0.81 + 0.035 * Math.sin(t * 0.31 + 0.8)),
        h * 1.05 * p,
        tp,
        0.05,
      );

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.055;
      fillBlob(
        ctx,
        w,
        h,
        w * (0.5 + 0.25 * Math.sin(t * 0.22)),
        h * (0.64 + 0.06 * Math.sin(t * 0.27)),
        h * 1.1 * p,
        sg,
        0.35,
      );
      fillBlob(
        ctx,
        w,
        h,
        w * (0.22 + 0.12 * Math.sin(t * 0.26 + 2)),
        h * (0.71 + 0.05 * Math.sin(t * 0.3 + 1)),
        h * 0.75 * p,
        a,
        0.28,
      );
      ctx.restore();

      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 3),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[3],
        ribbonThickness,
        tp,
        a,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 4),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[4],
        ribbonThickness,
        sg,
        tp,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 5),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[5],
        ribbonThickness,
        a,
        a2,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 6),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[6],
        ribbonThickness,
        a2,
        sg,
        AURORA_WAVE_PEAK,
      );
      fillAuroraRibbon(
        ctx,
        w,
        h,
        t,
        auroraWaveBaseY(h, 7),
        ribbonAmp,
        AURORA_WAVE_MOTIONS[7],
        ribbonThickness,
        tp,
        sg,
        AURORA_WAVE_PEAK,
      );

      ctx.save();
      const featherH = Math.max(h * 0.52, 140);
      const fade = ctx.createLinearGradient(0, 0, 0, featherH);
      fade.addColorStop(0, "rgba(255,255,255,0)");
      fade.addColorStop(0.22, "rgba(255,255,255,0.08)");
      fade.addColorStop(0.45, "rgba(255,255,255,0.38)");
      fade.addColorStop(0.68, "rgba(255,255,255,0.82)");
      fade.addColorStop(1, "rgba(255,255,255,1)");
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      lastRef.current = 0;
    };
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,hsl(var(--color-bg)/0)_0%,hsl(var(--color-bg)/0)_8%,hsl(var(--color-bg)/0.35)_18%,hsl(var(--color-success)/0.1)_32%,hsl(var(--color-accent)/0.09)_44%,hsl(var(--color-text-primary)/0.07)_54%,hsl(var(--color-accent-2)/0.12)_66%,hsl(var(--color-bg))_100%)]"
        aria-hidden
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block size-full"
        aria-hidden
      />
    </div>
  );
}
