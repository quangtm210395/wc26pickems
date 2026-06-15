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
      {/* Selection buttons */}
      <div className="flex gap-1.5">
        {selections.map((sel) => {
          const isActive = selectedKey === sel.key;
          return (
            <button
              key={sel.key}
              onClick={() => handleSelectKey(sel.key)}
              disabled={isPending}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span className="leading-tight">{sel.label}</span>
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground"
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
              className="min-h-[36px] flex-1 rounded-lg border border-border bg-accent px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent/70 disabled:opacity-60"
            >
              {preset.toLocaleString("vi-VN")}đ
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedKey(null);
              setError(null);
            }}
            className="min-h-[36px] rounded-lg border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent"
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
        <p className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded bg-green-50 px-2 py-1 text-[11px] text-green-700 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </p>
      )}
    </div>
  );
}
