"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "dashboard-window";
const VALID_WINDOWS = ["1d", "3d", "7d", "30d"];

export function WindowPersist({ activeWindow }: { activeWindow: string | undefined }) {
  const router = useRouter();

  useEffect(() => {
    if (activeWindow && VALID_WINDOWS.includes(activeWindow)) {
      // Save current window choice
      try { localStorage.setItem(STORAGE_KEY, activeWindow); } catch {}
    } else {
      // No window param — restore saved preference
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && VALID_WINDOWS.includes(saved)) {
          router.replace(`/dashboard?window=${saved}`);
        }
      } catch {}
    }
  }, [activeWindow, router]);

  return null;
}
