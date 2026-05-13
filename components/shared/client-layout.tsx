"use client";

import { useEffect } from "react";
import { getLenis } from "@/lib/lenis";
import { connectLenisToScrollTrigger } from "@/lib/scroll-trigger-lenis";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = getLenis();
    return connectLenisToScrollTrigger(lenis);
  }, []);

  return <>{children}</>;
}
