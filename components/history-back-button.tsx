"use client";

import { useRouter } from "next/navigation";

type HistoryBackButtonProps = {
  fallbackHref: string;
  className?: string;
};

export function HistoryBackButton({ fallbackHref, className }: HistoryBackButtonProps) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      data-history-back="true"
      data-fallback-href={fallbackHref}
      onClick={goBack}
      className={["history-back-button", className].filter(Boolean).join(" ")}
    >
      ← BACK
    </button>
  );
}
