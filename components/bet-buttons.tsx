"use client";

import { useState, useTransition } from "react";
import { placeBetAction } from "@/app/(tabs)/keo/actions";

interface Selection {
  key: string;
  label: string;
  odds: number;
}

interface BetButtonsProps {
  marketId: string;
  selections: Selection[];
}

const STAKE_PRESETS = [50, 100, 500];

export function BetButtons({ marketId, selections }: BetButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSelectKey(key: string) {
    // Toggle off if already selected
    if (selectedKey === key) {
      setSelectedKey(null);
    } else {
      setSelectedKey(key);
    }
    setError(null);
    setSuccess(null);
  }

  function handleStake(stake: number) {
    if (!selectedKey) return;
    const sel = selections.find((s) => s.key === selectedKey);
    if (!sel) return;

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await placeBetAction(marketId, selectedKey, stake);
        setSuccess(`Đặt cược ${stake.toLocaleString("vi-VN")}đ vào "${sel.label}" thành công!`);
        setSelectedKey(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Lỗi không xác định";
        setError(msg);
      }
    });
  }

  return (
    <div className="mt-1.5 space-y-1.5">
      {/* Selection buttons — lưới khi nhiều cửa (vd tỉ số chính xác), hàng ngang khi ít */}
      <div className={selections.length > 3 ? "grid grid-cols-3 gap-1.5" : "flex gap-1.5"}>
        {selections.map((sel) => {
          const isActive = selectedKey === sel.key;
          return (
            <button
              key={sel.key}
              onClick={() => handleSelectKey(sel.key)}
              disabled={isPending}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_14px_-6px_rgba(231,180,58,0.8)]"
                  : "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className="leading-tight">{sel.label}</span>
              <span
                className={`font-display text-[11px] font-semibold tabular-nums ${
                  isActive ? "text-primary-foreground/80" : "text-primary/90"
                }`}
              >
                {sel.odds.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stake chooser — only shows after a selection is tapped */}
      {selectedKey && !isPending && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Cược:</span>
          {STAKE_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => handleStake(preset)}
              disabled={isPending}
              className="min-h-[36px] flex-1 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1 font-display text-xs font-semibold tabular-nums text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
            >
              {preset.toLocaleString("vi-VN")}đ
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedKey(null);
              setError(null);
            }}
            className="min-h-[36px] rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/60"
          >
            Hủy
          </button>
        </div>
      )}

      {/* Pending indicator */}
      {isPending && (
        <p className="text-[10px] text-muted-foreground animate-pulse">Đang đặt cược...</p>
      )}

      {/* Error / Success messages */}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-accent/40 bg-accent/20 px-2 py-1 text-[11px] text-emerald-300">
          {success}
        </p>
      )}
    </div>
  );
}
