import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/**
 * Bridges Lenis smooth scroll to ScrollTrigger so scrub / pin / start-end
 * use the same scroll position Lenis drives (fixes triggers never firing).
 */
export function connectLenisToScrollTrigger(lenis: Lenis): () => void {
  const el = document.documentElement;

  const onLenisScroll = () => {
    ScrollTrigger.update();
  };
  const unsubScroll = lenis.on("scroll", onLenisScroll);

  ScrollTrigger.scrollerProxy(el, {
    scrollTop(value?: number): number {
      if (typeof value === "number") {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    scrollLeft() {
      return 0;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        bottom: window.innerHeight,
        right: window.innerWidth,
      };
    },
  });

  const onStRefresh = () => {
    lenis.resize();
  };
  ScrollTrigger.addEventListener("refresh", onStRefresh);

  const onWinResize = () => {
    ScrollTrigger.refresh();
  };
  window.addEventListener("resize", onWinResize);

  requestAnimationFrame(() => {
    ScrollTrigger.refresh();
  });

  return () => {
    unsubScroll();
    ScrollTrigger.removeEventListener("refresh", onStRefresh);
    window.removeEventListener("resize", onWinResize);
    ScrollTrigger.scrollerProxy(el, undefined);
  };
}
