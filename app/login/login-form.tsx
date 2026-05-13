"use client";

import { useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { emailPasswordSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { AuroraBackground } from "@/components/ui/primitives/aurora-background";
import { Skeleton } from "@/components/ui/skeleton";

function parseNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/library";
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next = useMemo(() => parseNext(searchParams.get("next")), [searchParams]);
  const authError = searchParams.get("error");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = emailPasswordSchema.safeParse({ email, password });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? "Invalid input");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    router.replace(next);
    router.refresh();
  };

  return (
    <AuroraBackground className="min-h-screen">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <GlowCard className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.85] p-8">
          <h1 className="font-display text-2xl text-[hsl(var(--color-text-primary))]">Sign in</h1>
          <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
            Email and password are required to use the library, uploads, and chat.
          </p>

          {authError ? (
            <p className="mt-4 rounded-lg border border-[hsl(var(--color-danger)/0.45)] bg-[hsl(var(--color-danger)/0.1)] px-3 py-2 text-sm text-[hsl(var(--color-danger))]">
              {authError === "missing_code"
                ? "Missing confirmation code. Request a new link or try signing in again."
                : decodeURIComponent(authError)}
            </p>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[hsl(var(--color-bg-overlay))]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[hsl(var(--color-bg-overlay))]"
                required
                minLength={8}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[hsl(var(--color-accent))] text-[hsl(var(--color-bg))] hover:bg-[hsl(var(--color-accent))]/90"
              disabled={submitting}
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[hsl(var(--color-text-secondary))]">
            No account?{" "}
            <Link href="/signup" className="text-[hsl(var(--color-accent))] underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs text-[hsl(var(--color-text-tertiary))] hover:text-[hsl(var(--color-text-secondary))]"
            >
              ← Back to home
            </Link>
          </p>
        </GlowCard>
      </main>
    </AuroraBackground>
  );
}

export function LoginFormFallback() {
  return (
    <AuroraBackground className="min-h-screen">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <GlowCard className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.85] p-8">
          <Skeleton className="h-8 w-40 bg-[hsl(var(--color-bg-hover))]" />
          <Skeleton className="mt-3 h-4 w-full bg-[hsl(var(--color-bg-hover))]" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-10 w-full bg-[hsl(var(--color-bg-hover))]" />
            <Skeleton className="h-10 w-full bg-[hsl(var(--color-bg-hover))]" />
            <Skeleton className="h-10 w-full bg-[hsl(var(--color-bg-hover))]" />
          </div>
        </GlowCard>
      </main>
    </AuroraBackground>
  );
}
