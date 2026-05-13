"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Library, MessageSquare, Upload, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg))/0.92] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/library"
          className="text-sm font-semibold tracking-tight text-[hsl(var(--color-text-primary))]"
        >
          Archive
        </Link>
        <nav className="flex flex-1 items-center justify-center gap-1 sm:gap-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors sm:text-sm",
                  active
                    ? "border-[hsl(var(--color-accent)/0.55)] bg-[hsl(var(--color-bg-elevated))] text-[hsl(var(--color-text-primary))]"
                    : "border-transparent text-[hsl(var(--color-text-secondary))] hover:border-[hsl(var(--color-border-strong))] hover:bg-[hsl(var(--color-bg-hover))]"
                )}
              >
                <Icon className="size-3.5 shrink-0 text-[hsl(var(--color-accent))]" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-2 text-[hsl(var(--color-text-secondary))] hover:text-[hsl(var(--color-text-primary))]"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
