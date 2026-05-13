"use client";

import { useEffect } from "react";
import { getLenis } from "@/lib/lenis";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getLenis();
    return () => {
      // Keep lenis alive across route changes
    };
  }, []);

  return <>{children}</>;
}
