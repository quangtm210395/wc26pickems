"use client";

import { useState } from "react";

interface ShareButtonProps {
  userId: string;
}

export function ShareButton({ userId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/share/${userId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Đường Đến Ngai Vàng World Cup 2026",
          text: "Xem thứ hạng của mình trên BXH World Cup 2026!",
          url,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`Copy link này: ${url}`);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent"
    >
      <span>📤</span>
      {copied ? "Đã copy link!" : "Chia sẻ BXH"}
    </button>
  );
}
