"use client";

import { useEffect, useRef } from "react";
import { ensureBrowserSession } from "@/lib/supabase/browser-session";

/**
 * Proactively establishes an anonymous session after load so navigations and SWR see a user sooner.
 */
export function EnsureSupabaseSession() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void ensureBrowserSession().then((result) => {
      if (!result.ok) {
        console.warn("[auth]", result.message);
      }
    });
  }, []);

  return null;
}
