"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  userId: string;
}

export function PinnedViewRedirect({ userId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only redirect when landing on bare /candidates (no filters set)
    if (searchParams.toString() !== "") return;

    try {
      const stored = localStorage.getItem(`cri-crm-saved-views:${userId}`);
      if (!stored) return;
      const views: Array<{ href: string; pinned?: boolean }> = JSON.parse(stored);
      const pinned = views.find((v) => v.pinned);
      if (pinned) router.replace(pinned.href);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
