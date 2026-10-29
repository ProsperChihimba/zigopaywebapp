"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the page every few seconds while something is still being worked on in the background. */
export function AutoRefresh({ every = 3000, max = 20 }: { every?: number; max?: number }) {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const timer = setInterval(() => {
      if (++n > max) clearInterval(timer);
      else router.refresh();
    }, every);
    return () => clearInterval(timer);
  }, [router, every, max]);
  return null;
}
