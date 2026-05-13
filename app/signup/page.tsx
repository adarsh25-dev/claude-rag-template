"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { emailPasswordSchema } from "@/lib/validators/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlowCard } from "@/components/ui/primitives/glow-card";
import { AuroraBackground } from "@/components/ui/primitives/aurora-background";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL ?? "";

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
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      router.replace("/library");
      router.refresh();
      return;
    }

    setCheckEmail(true);
    toast.success("Check your email to confirm your account, then sign in.");
  };

  if (checkEmail) {
    return (
      <AuroraBackground className="min-h-screen">
        <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
          <GlowCard className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.85] p-8 text-center">
            <h1 className="font-display text-2xl text-[hsl(var(--color-text-primary))]">Confirm your email</h1>
            <p className="mt-3 text-sm text-[hsl(var(--color-text-secondary))]">
              We sent a link to <span className="text-[hsl(var(--color-text-primary))]">{email}</span>. After you
              confirm, you can sign in.
            </p>
            <Link href="/login" className={cn(buttonVariants({ variant: "primary" }), "mt-8 inline-flex w-full justify-center")}>
              Go to sign in
            </Link>
          </GlowCard>
        </main>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground className="min-h-screen">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <GlowCard className="rounded-2xl border border-[hsl(var(--color-border-strong))] bg-[hsl(var(--color-bg-elevated))/0.85] p-8">
          <h1 className="font-display text-2xl text-[hsl(var(--color-text-primary))]">Create account</h1>
          <p className="mt-2 text-sm text-[hsl(var(--color-text-secondary))]">
            Use a strong password. If email confirmation is enabled in Supabase, you will verify by email before your
            first sign-in.
          </p>

          <form className="mt-8 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
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
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
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
              {submitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[hsl(var(--color-text-secondary))]">
            Already have an account?{" "}
            <Link href="/login" className="text-[hsl(var(--color-accent))] underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="mt-4 text-center">
            <Link href="/" className="text-xs text-[hsl(var(--color-text-tertiary))] hover:text-[hsl(var(--color-text-secondary))]">
              ← Back to home
            </Link>
          </p>
        </GlowCard>
      </main>
    </AuroraBackground>
  );
}
