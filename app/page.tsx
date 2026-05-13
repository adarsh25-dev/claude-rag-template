import Link from "next/link";
import { AuroraBackground } from "@/components/ui/primitives/aurora-background";
import { NoiseLayer } from "@/components/ui/primitives/noise-layer";
import { MagneticButton } from "@/components/ui/primitives/magnetic-button";
import App from "@/src/App";

export default function HomePage() {
  return (
    <AuroraBackground className="relative min-h-screen">
      <NoiseLayer />
      <header className="sticky top-0 z-50 border-b border-transparent backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--color-bg))/0.45]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-sm font-semibold text-[hsl(var(--color-text-primary))]"
          >
            claude-rag-template
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[hsl(var(--color-text-secondary))] md:flex">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#demo">Demo</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden text-sm text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))] sm:inline"
            >
              Log in
            </Link>
            <MagneticButton href="/signup" variant="secondary" size="sm">
              Sign up
            </MagneticButton>
            <MagneticButton
              href="/login?next=/chat"
              variant="primary"
              size="sm"
            >
              Open app
            </MagneticButton>
          </div>
        </div>
      </header>

      <main>
        <App />
      </main>
    </AuroraBackground>
  );
}
