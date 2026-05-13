import { cn } from "@/lib/utils";

/** Vaul overlay: blur + scrim; HSL fallbacks if theme tokens are missing. */
export const ragDrawerOverlayClassName = cn(
  "fixed inset-0 z-50 backdrop-blur-sm",
  "bg-[hsl(var(--color-bg,0_0%_4%)_/_0.78)]",
);

/** Bottom sheet glass panel (mobile filters, sources list). */
export const ragDrawerSheetClassName = cn(
  "rounded-t-2xl border shadow-[0_-12px_48px_-20px_hsl(0_0%_0%_/_0.45)]",
  "border-[hsl(var(--color-border-strong,210_22%_88%_/_0.18))]",
  "bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.88)] backdrop-blur-xl",
  "supports-[backdrop-filter]:bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.76)]",
);

/** Right-edge detail panel (source chunk drawer). */
export const ragSourceDrawerPanelClassName = cn(
  "h-full w-full max-w-xl border-l shadow-[-12px_0_48px_-20px_hsl(0_0%_0%_/_0.4)]",
  "border-[hsl(var(--color-border-strong,210_22%_88%_/_0.2))]",
  "bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.9)] backdrop-blur-xl",
  "supports-[backdrop-filter]:bg-[hsl(var(--color-bg-overlay,220_14%_9%)_/_0.78)]",
);
