import type { TargetAndTransition } from "framer-motion";

/** Standard press feedback; omit when the user prefers reduced motion. */
export function motionTapScale(
  prefersReducedMotion: boolean | null | undefined,
): TargetAndTransition | undefined {
  return prefersReducedMotion ? undefined : { scale: 0.95 };
}
