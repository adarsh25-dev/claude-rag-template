import Lenis from "lenis";

let lenis: Lenis | null = null;

export function getLenis() {
  if (!lenis) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      // Let nested overflow-y regions (chat transcript, drawers, sidebars) receive wheel/touch scroll
      allowNestedScroll: true,
    });

    function raf(time: number) {
      lenis?.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }
  return lenis;
}

export function destroyLenis() {
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}
