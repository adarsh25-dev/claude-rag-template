"use client";

import { useEffect } from "react";
import { EnsureSupabaseSession } from "@/components/auth/ensure-supabase-session";
import { getLenis } from "@/lib/lenis";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getLenis();
    return () => {
      // Keep lenis alive across route changes
    };
  }, []);

  return (
    <>
      <EnsureSupabaseSession />
      {children}
    </>
  );
}
