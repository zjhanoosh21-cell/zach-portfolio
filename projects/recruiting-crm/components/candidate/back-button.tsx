"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-block text-sm text-slate-500 hover:text-slate-800"
    >
      ← Back
    </button>
  );
}
