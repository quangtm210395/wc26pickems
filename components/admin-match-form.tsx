"use client";

import { useTransition, useState } from "react";
import { saveMatchResult } from "@/app/admin/actions";
import type { MatchStatus } from "@prisma/client";

interface AdminMatchFormProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  currentStatus: MatchStatus;
  currentHomeScore: number | null;
  currentAwayScore: number | null;
  currentHomePens: number | null;
  currentAwayPens: number | null;
  currentStats: {
    homeCorners: number | null;
    awayCorners: number | null;
    homeYellow: number | null;
    awayYellow: number | null;
    homeRed: number | null;
    awayRed: number | null;
    homeShots: number | null;
    awayShots: number | null;
    homePoss: number | null;
    awayPoss: number | null;
  } | null;
}

function parseNum(val: string): number | null {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

export function AdminMatchForm({
  matchId,
  homeTeamName,
  awayTeamName,
  currentStatus,
  currentHomeScore,
  currentAwayScore,
  currentHomePens,
  currentAwayPens,
  currentStats,
}: AdminMatchFormProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const status = fd.get("status") as MatchStatus;

    startTransition(async () => {
      try {
        const res = await saveMatchResult({
          matchId,
          status,
          homeScore: parseNum(fd.get("homeScore") as string),
          awayScore: parseNum(fd.get("awayScore") as string),
          homePens: parseNum(fd.get("homePens") as string),
          awayPens: parseNum(fd.get("awayPens") as string),
          stats: {
            homeCorners: parseNum(fd.get("homeCorners") as string),
            awayCorners: parseNum(fd.get("awayCorners") as string),
            homeYellow: parseNum(fd.get("homeYellow") as string),
            awayYellow: parseNum(fd.get("awayYellow") as string),
            homeRed: parseNum(fd.get("homeRed") as string),
            awayRed: parseNum(fd.get("awayRed") as string),
            homeShots: parseNum(fd.get("homeShots") as string),
            awayShots: parseNum(fd.get("awayShots") as string),
            homePoss: parseNum(fd.get("homePoss") as string),
            awayPoss: parseNum(fd.get("awayPoss") as string),
          },
        });
        if (res.settled) {
          setResult(`Đã settle: ${res.settled.pickems} pickems, ${res.settled.bets} kèo`);
        } else {
          setResult("Đã lưu.");
        }
      } catch (err) {
        setResult(`Lỗi: ${err instanceof Error ? err.message : "Không xác định"}`);
      }
    });
  }

  const numInputCls =
    "w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="rounded-lg border bg-card">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setResult(null);
        }}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-sm font-medium">
          {homeTeamName} vs {awayTeamName}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              currentStatus === "FINISHED"
                ? "bg-muted text-muted-foreground"
                : currentStatus === "LIVE"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {currentStatus}
          </span>
          {currentHomeScore !== null && currentAwayScore !== null && (
            <span className="text-sm font-bold tabular-nums">
              {currentHomeScore}–{currentAwayScore}
            </span>
          )}
          <span className="text-muted-foreground">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t p-3">
          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Trạng thái
            </label>
            <select
              name="status"
              defaultValue={currentStatus}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="LIVE">LIVE</option>
              <option value="FINISHED">FINISHED</option>
            </select>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {homeTeamName} (bàn)
              </label>
              <input
                name="homeScore"
                type="number"
                min={0}
                defaultValue={currentHomeScore ?? ""}
                placeholder="–"
                className={numInputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {awayTeamName} (bàn)
              </label>
              <input
                name="awayScore"
                type="number"
                min={0}
                defaultValue={currentAwayScore ?? ""}
                placeholder="–"
                className={numInputCls}
              />
            </div>
          </div>

          {/* Penalties */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Luân lưu {homeTeamName}
              </label>
              <input
                name="homePens"
                type="number"
                min={0}
                defaultValue={currentHomePens ?? ""}
                placeholder="–"
                className={numInputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Luân lưu {awayTeamName}
              </label>
              <input
                name="awayPens"
                type="number"
                min={0}
                defaultValue={currentAwayPens ?? ""}
                placeholder="–"
                className={numInputCls}
              />
            </div>
          </div>

          {/* Stats */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground select-none">
              Thống kê (mở rộng)
            </summary>
            <div className="mt-2 space-y-2">
              {(
                [
                  ["Phạt góc", "homeCorners", "awayCorners"],
                  ["Thẻ vàng", "homeYellow", "awayYellow"],
                  ["Thẻ đỏ", "homeRed", "awayRed"],
                  ["Sút", "homeShots", "awayShots"],
                  ["Kiểm soát bóng %", "homePoss", "awayPoss"],
                ] as const
              ).map(([label, homeKey, awayKey]) => (
                <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                  <input
                    name={homeKey}
                    type="number"
                    min={0}
                    defaultValue={currentStats?.[homeKey] ?? ""}
                    placeholder="–"
                    className={numInputCls}
                  />
                  <span className="text-center text-[10px] text-muted-foreground whitespace-nowrap">
                    {label}
                  </span>
                  <input
                    name={awayKey}
                    type="number"
                    min={0}
                    defaultValue={currentStats?.[awayKey] ?? ""}
                    placeholder="–"
                    className={numInputCls}
                  />
                </div>
              ))}
            </div>
          </details>

          {result && (
            <p
              className={`rounded px-2 py-1.5 text-xs ${
                result.startsWith("Lỗi")
                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              }`}
            >
              {result}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {isPending ? "Đang lưu…" : "Lưu kết quả"}
          </button>
        </form>
      )}
    </div>
  );
}
