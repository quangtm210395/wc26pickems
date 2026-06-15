"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReferralCard({ code, count }: { code: string; count: number }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/r/${code}` : `/r/${code}`;

  async function share() {
    const text = "Vào chơi dự đoán World Cup 2026 với mình nè! 👑";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Đường Đến Ngai Vàng WC2026", text, url: link });
        return;
      }
    } catch {
      /* user huỷ share → thôi */
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">🎟️ Mời bạn bè</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-sm text-muted-foreground">
          Mỗi người bạn đăng ký qua link của bạn: <b className="text-primary">bạn +500đ</b>, bạn ấy{" "}
          <b className="text-primary">+300đ</b>. Mời càng nhiều, leo BXH càng nhanh!
        </p>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <code className="flex-1 truncate text-xs">{link}</code>
        </div>
        <button
          onClick={share}
          className="min-h-[44px] w-full rounded-xl bg-primary px-4 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground transition-colors active:opacity-90"
        >
          {copied ? "✓ Đã sao chép link" : "📤 Chia sẻ link mời"}
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Đã mời được <b className="text-foreground tabular-nums">{count}</b> người
        </p>
      </CardContent>
    </Card>
  );
}
