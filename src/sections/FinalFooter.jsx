"use client";

import Link from "next/link";

const links = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Sign up" },
  { href: "#features", label: "Features" },
  { href: "https://github.com", label: "GitHub", external: true },
];

export function FinalFooter() {
  return (
    <footer className="relative z-20 border-t border-[hsl(var(--color-border))] bg-[hsl(var(--color-bg)/0.7)] py-8 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <p className="text-sm text-[hsl(var(--color-text-tertiary))]">
          © {new Date().getFullYear()} claude-rag-template
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-[hsl(var(--color-text-secondary))]">
          {links.map((l) =>
            l.external ? (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[hsl(var(--color-text-primary))]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-[hsl(var(--color-text-primary))]"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </footer>
  );
}

export default FinalFooter;
