"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  candidateId: string;
}

export function DuplicateDismiss({ candidateId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  async function handleDismiss() {
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDuplicate: false }),
    });
    if (res.ok) {
      setDone(true);
      startTransition(() => router.refresh());
    }
  }

  if (done) return null;

  return (
    <button
      onClick={handleDismiss}
      disabled={isPending}
      className="text-xs px-2.5 py-1 rounded border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50 shrink-0"
    >
      {isPending ? "…" : "Dismiss"}
    </button>
  );
}
