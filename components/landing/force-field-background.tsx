"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type p5 from "p5";

export interface ForceFieldBackgroundProps {
  /** URL of the image to use as the base for the particle field */
  imageUrl?: string;
  /** Base hue for the color palette (0-360). Default matches theme steel blue (~206). */
  hue?: number;
  saturation?: number;
  threshold?: number;
  minStroke?: number;
  maxStroke?: number;
  spacing?: number;
  noiseScale?: number;
  density?: number;
  invertImage?: boolean;
  invertWireframe?: boolean;
  magnifierEnabled?: boolean;
  magnifierRadius?: number;
  forceStrength?: number;
  friction?: number;
  restoreSpeed?: number;
  className?: string;
}

/**
 * Interactive particle background (p5.js) that repels from the cursor.
 * Honors prefers-reduced-motion via Framer Motion’s useReducedMotion.
 */
export function ForceFieldBackground({
  imageUrl = "https://cdn.pixabay.com/photo/2024/12/13/20/29/alps-9266131_1280.jpg",
  hue = 206,
  saturation = 44,
  threshold = 255,
  minStroke = 1.5,
  maxStroke = 5,
  spacing = 11,
  noiseScale = 0,
  density = 2.0,
  invertImage = true,
  invertWireframe = true,
  magnifierEnabled = true,
  magnifierRadius = 150,
  forceStrength = 11,
  friction = 0.9,
  restoreSpeed = 0.05,
  className = "",
}: ForceFieldBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propsRef = useRef({
    hue,
    saturation,
    threshold,
    minStroke,
    maxStroke,
    spacing,
    noiseScale,
    density,
    invertImage,
    invertWireframe,
    magnifierEnabled,
    magnifierRadius,
    forceStrength,
    friction,
    restoreSpeed,
  });

  useEffect(() => {
    propsRef.current = {
      hue,
      saturation,
      threshold,
      minStroke,
      maxStroke,
      spacing,
      noiseScale,
      density,
      invertImage,
      invertWireframe,
      magnifierEnabled,
      magnifierRadius,
      forceStrength,
      friction,
      restoreSpeed,
    };
  }, [
    hue,
    saturation,
    threshold,
    minStroke,
    maxStroke,
    spacing,
    noiseScale,
    density,
    invertImage,
    invertWireframe,
    magnifierEnabled,
    magnifierRadius,
    forceStrength,
    friction,
    restoreSpeed,
  ]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const host = containerRef.current;
    if (!host) return;

    let cancelled = false;
    let instance: p5 | null = null;

    void import("p5").then((p5Module) => {
      if (cancelled || !containerRef.current) return;

      const P5 = p5Module.default;

      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }

      const sketch = (p: p5) => {
      let originalImg: p5.Image;
      let img: p5.Image;
      let palette: p5.Color[] = [];
      let points: {
        pos: p5.Vector;
        originalPos: p5.Vector;
        vel: p5.Vector;
      }[] = [];

      let lastHue = -1;
      let lastSaturation = -1;
      let lastSpacing = -1;
      let lastNoiseScale = -1;
      let lastDensity = -1;
      let lastInvertImage: boolean | null = null;
      let magnifierX = 0;
      let magnifierY = 0;
      const magnifierInertia = 0.1;

      p.preload = () => {
        p.loadImage(
          imageUrl,
          (loadedImg) => {
            originalImg = loadedImg;
            setIsLoading(false);
          },
          () => {
            setError("Failed to load image");
            setIsLoading(false);
          },
        );
      };

      p.setup = () => {
        if (!originalImg) return;
        if (!containerRef.current) return;

        const { clientWidth, clientHeight } = containerRef.current;
        p.createCanvas(clientWidth, clientHeight);

        magnifierX = p.width / 2;
        magnifierY = p.height / 2;

        processImage();
        generatePalette(propsRef.current.hue, propsRef.current.saturation);
        generatePoints();
      };

      p.windowResized = () => {
        if (!containerRef.current || !originalImg) return;
        const { clientWidth, clientHeight } = containerRef.current;
        p.resizeCanvas(clientWidth, clientHeight);
        processImage();
        generatePoints();
      };

      function processImage() {
        if (!originalImg) return;
        img = originalImg.get();
        if (p.width > 0 && p.height > 0) {
          img.resize(p.width, p.height);
        }
        img.filter(p.GRAY);

        if (propsRef.current.invertImage) {
          img.loadPixels();
          for (let i = 0; i < img.pixels.length; i += 4) {
            img.pixels[i] = 255 - img.pixels[i];
            img.pixels[i + 1] = 255 - img.pixels[i + 1];
            img.pixels[i + 2] = 255 - img.pixels[i + 2];
          }
          img.updatePixels();
        }
        lastInvertImage = propsRef.current.invertImage;
      }

      function generatePalette(h: number, s: number) {
        palette = [];
        p.push();
        p.colorMode(p.HSL);
        for (let i = 0; i < 12; i++) {
          const lightness = p.map(i, 0, 11, 92, 8);
          palette.push(p.color(h, s, lightness));
        }
        p.pop();
      }

      function generatePoints() {
        if (!img) return;
        points = [];
        const { spacing: sp, density: den, noiseScale: ns } = propsRef.current;
        const safeSpacing = Math.max(2, sp);

        for (let y = 0; y < img.height; y += safeSpacing) {
          for (let x = 0; x < img.width; x += safeSpacing) {
            if (p.random() > den) continue;

            const nx = p.noise(x * ns, y * ns) - 0.5;
            const ny = p.noise((x + 500) * ns, (y + 500) * ns) - 0.5;
            const px = x + nx * safeSpacing;
            const py = y + ny * safeSpacing;

            points.push({
              pos: p.createVector(px, py),
              originalPos: p.createVector(px, py),
              vel: p.createVector(0, 0),
            });
          }
        }

        lastSpacing = sp;
        lastNoiseScale = ns;
        lastDensity = den;
      }

      function applyForceField(mx: number, my: number) {
        const props = propsRef.current;
        if (!props.magnifierEnabled) return;

        for (const pt of points) {
          const dir = P5.Vector.sub(pt.pos, p.createVector(mx, my));
          const d = dir.mag();

          if (d < props.magnifierRadius) {
            dir.normalize();
            const force = dir.mult(props.forceStrength / Math.max(1, d));
            pt.vel.add(force);
          }

          pt.vel.mult(props.friction);

          const restore = P5.Vector.sub(pt.pos, pt.originalPos).mult(-props.restoreSpeed);
          pt.vel.add(restore);

          pt.pos.add(pt.vel);
        }
      }

      p.draw = () => {
        if (!img) return;
        p.background(10, 10, 10); // neutral charcoal, aligned with --color-bg (~4% L)

        const props = propsRef.current;

        if (props.hue !== lastHue || props.saturation !== lastSaturation) {
          generatePalette(props.hue, props.saturation);
          lastHue = props.hue;
          lastSaturation = props.saturation;
        }

        if (props.invertImage !== lastInvertImage) {
          processImage();
        }

        if (
          props.spacing !== lastSpacing ||
          props.noiseScale !== lastNoiseScale ||
          props.density !== lastDensity
        ) {
          generatePoints();
        }

        magnifierX = p.lerp(magnifierX, p.mouseX, magnifierInertia);
        magnifierY = p.lerp(magnifierY, p.mouseY, magnifierInertia);

        applyForceField(magnifierX, magnifierY);

        img.loadPixels();
        p.noFill();

        for (const pt of points) {
          const x = pt.pos.x;
          const y = pt.pos.y;
          const d = p.dist(x, y, magnifierX, magnifierY);

          const px = p.constrain(p.floor(x), 0, img.width - 1);
          const py = p.constrain(p.floor(y), 0, img.height - 1);

          const index = (px + py * img.width) * 4;
          const brightness = img.pixels[index];

          if (brightness === undefined) continue;

          const condition = props.invertWireframe
            ? brightness < props.threshold
            : brightness > props.threshold;

          if (condition) {
            let shadeIndex = Math.floor(p.map(brightness, 0, 255, 0, palette.length - 1));
            shadeIndex = p.constrain(shadeIndex, 0, palette.length - 1);

            let strokeSize = p.map(brightness, 0, 255, props.minStroke, props.maxStroke);

            if (props.magnifierEnabled && d < props.magnifierRadius) {
              const factor = p.map(d, 0, props.magnifierRadius, 2, 1);
              strokeSize *= factor;
            }

            const c = palette[shadeIndex];
            if (c) {
              p.stroke(c);
              p.strokeWeight(strokeSize);
              p.point(x, y);
            }
          }
        }
      };
    };

      instance = new P5(sketch, host);
      p5InstanceRef.current = instance;
    });

    return () => {
      cancelled = true;
      instance?.remove();
      p5InstanceRef.current = null;
    };
  }, [imageUrl, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <div
        className={`relative h-full w-full overflow-hidden bg-[hsl(var(--color-bg))] ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[hsl(var(--color-bg))] ${className}`}
      ref={containerRef}
      aria-hidden
    >
      {isLoading ? (
        <div
          className="absolute inset-0 bg-[hsl(var(--color-bg-elevated))] motion-safe:animate-pulse"
          aria-hidden
        />
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-[hsl(var(--color-danger))] text-xs tracking-widest uppercase">
          {error}
        </div>
      ) : null}
    </div>
  );
}
