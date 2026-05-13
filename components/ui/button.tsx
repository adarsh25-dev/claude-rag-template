import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-300 outline-none select-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-accent))]/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--color-bg-elevated))] text-[hsl(var(--color-text-primary))] border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))] hover:border-[hsl(var(--color-border-strong))]/80",
        primary:
          "bg-gradient-to-r from-[hsl(var(--color-accent))] to-[hsl(206,48%,48%)] text-[hsl(var(--color-bg))] border-transparent shadow-[0_0_20px_hsl(var(--color-accent-glow))] hover:shadow-[0_0_30px_hsl(var(--color-accent-glow))] hover:brightness-110",
        secondary:
          "bg-transparent text-[hsl(var(--color-text-primary))] border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))] hover:border-[hsl(var(--color-border-strong))]/60",
        ghost:
          "bg-transparent border-transparent text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))] hover:bg-[hsl(var(--color-bg-hover))]/50",
        danger:
          "bg-[hsl(var(--color-danger))]/10 text-[hsl(var(--color-danger))] border-[hsl(var(--color-danger))]/20 hover:bg-[hsl(var(--color-danger))]/20",
        link: "text-[hsl(var(--color-accent))] underline-offset-4 hover:underline border-transparent bg-transparent",
      },
      size: {
        default: "h-10 gap-2 px-5 py-2",
        sm: "h-8 gap-1.5 px-3 text-xs rounded-lg",
        lg: "h-12 gap-2 px-6 text-base rounded-xl",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
