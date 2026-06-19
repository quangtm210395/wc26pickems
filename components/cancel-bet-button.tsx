"use client";

import { useState, useTransition } from "react";
import { cancelBetAction } from "@/app/(tabs)/keo/actions";

/** Nút hủy kèo (chỉ hiện với kèo chưa khóa). Bấm → xác nhận 1 bước → hoàn cược. */
export function CancelBetButton({ betId }: { betId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          setError(null);
        }}
        className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive"
      >
        Hủy kèo
      </button>
    );
  }

  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5 text-[11px]">
      <span className="text-muted-foreground">Hủy &amp; hoàn cược?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              await cancelBetAction(betId);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Có lỗi, thử lại");
              setConfirming(false);
            }
          })
        }
        className="rounded bg-destructive/15 px-2 py-0.5 font-semibold text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-60"
      >
        {pending ? "Đang hủy…" : "Hủy"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="px-1 text-muted-foreground hover:text-foreground"
      >
        Không
      </button>
      {error && <span className="w-full text-right text-destructive">{error}</span>}
    </span>
  );
}
