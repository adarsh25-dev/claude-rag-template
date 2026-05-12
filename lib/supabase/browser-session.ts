import { createClient } from "@/lib/supabase/client";

export type EnsureBrowserSessionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Client-only: ensures Supabase cookies exist for same-origin API routes.
 * Call from event handlers (e.g. before upload), not during render.
 */
export async function ensureBrowserSession(): Promise<EnsureBrowserSessionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return { ok: true };
  }

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    return {
      ok: false,
      message:
        "Could not start a session. In Supabase enable Anonymous sign-in (Authentication → Providers → Anonymous), then try again.",
    };
  }
  return { ok: true };
}
