"use client";

import { useState } from "react";

interface ShareButtonProps {
  path: string; // đường dẫn share, vd "/share/<id>" hoặc "/nhom/<code>"
  caption: string; // văn mẫu gợi ý
  label?: string;
}

export function ShareButton({ path, caption, label = "Chia sẻ" }: ShareButtonProps) {
  const [msg, setMsg] = useState<string | null>(null);
  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  };
  const fullUrl = () => `${window.location.origin}${path}`;

  async function share() {
    const url = fullUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Đường Đến Ngai Vàng World Cup 2026",
          text: caption,
          url,
        });
        return;
      } catch {
        // huỷ hoặc lỗi → rơi xuống copy
      }
    }
    await copyAll();
  }

  async function copyAll() {
    const text = `${caption}\n${fullUrl()}`;
    try {
      await navigator.clipboard.writeText(text);
      flash("Đã copy văn mẫu + link!");
    } catch {
      alert(text);
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-dashed border-border bg-muted/40 p-2.5 text-xs leading-relaxed text-muted-foreground">
        {caption}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span>📤</span> {label}
        </button>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:bg-accent"
        >
          <span>📋</span> Văn mẫu
        </button>
      </div>
      {msg && <p className="text-center text-xs text-emerald-400">{msg}</p>}
    </div>
  );
}
