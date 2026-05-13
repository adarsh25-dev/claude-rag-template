"use client";

import { useEffect, useSyncExternalStore } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** @type {Lenis | null} */
let lenisInstance = null;
/** @type {((time: number) => void) | null} */
let tickerFn = null;
let subscriberCount = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return lenisInstance;
}

/**
 * Global Lenis singleton wired to GSAP ScrollTrigger (do not combine with `lib/lenis` — one driver only).
 * @returns {Lenis | null}
 */
export function getSmoothScrollLenis() {
  return lenisInstance;
}

/**
 * Initialize Lenis once and drive it from `gsap.ticker` so ScrollTrigger stays in sync.
 * @param {import("lenis").LenisOptions} [options] Lenis constructor options (read once on first init)
 */
export function useSmoothScroll(options) {
  useSyncExternalStore(subscribe, getSnapshot, () => null);

  useEffect(() => {
    subscriberCount += 1;

    if (lenisInstance) {
      emit();
      return () => {
        subscriberCount -= 1;
        if (subscriberCount <= 0) {
          teardownLenis();
        }
      };
    }

    gsap.registerPlugin(ScrollTrigger);

    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      allowNestedScroll: true,
      ...(options ?? {}),
    });

    lenisInstance.on("scroll", ScrollTrigger.update);

    tickerFn = (time) => {
      lenisInstance?.raf(time * 1000);
    };
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);

    emit();

    return () => {
      subscriberCount -= 1;
      if (subscriberCount <= 0) {
        teardownLenis();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- singleton reads options only on first init
  }, []);
}

function teardownLenis() {
  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  if (lenisInstance) {
    lenisInstance.off("scroll", ScrollTrigger.update);
    lenisInstance.destroy();
    lenisInstance = null;
  }
  emit();
}
