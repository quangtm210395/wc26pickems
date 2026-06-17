"use client";

import { useState } from "react";

/**
 * Nút chia sẻ gọn cho trang bài viết tin tức.
 * Bấm → mở share sheet điện thoại (Zalo/Messenger/…) qua Web Share API;
 * máy không hỗ trợ (desktop) → copy link vào clipboard + báo toast.
 */
export function ArticleShareButton({ slug, title }: { slug: string; title: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };

  async function onShare() {
    const url = `${window.location.origin}/tin/${slug}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // người dùng huỷ hoặc lỗi → rơi xuống copy link
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      flash("Đã copy link!");
    } catch {
      window.prompt("Copy link bài viết:", url);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onShare}
        aria-label="Chia sẻ bài viết"
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent active:opacity-70"
      >
        <span aria-hidden>📤</span> Chia sẻ
      </button>
      {msg && (
        <span className="absolute right-0 top-full z-10 mt-1 whitespace-nowrap rounded bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">
          {msg}
        </span>
      )}
    </div>
  );
}
