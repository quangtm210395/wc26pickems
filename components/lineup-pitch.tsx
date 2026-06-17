"use client";

import { useState } from "react";
import { playerPositions, ratingColor } from "@/lib/lineup";

export type PitchPlayer = {
  name: string;
  number: number | null;
  isStarter: boolean;
  order: number;
  rating: number | null;
  ratingSource: string | null;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
  subbedOut: boolean;
};

export type TeamLineup = {
  teamName: string;
  flag: string | null;
  formation: string | null;
  players: PitchPlayer[];
};

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function PlayerMarker({ p }: { p: PitchPlayer }) {
  return (
    <div className="flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center">
      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold tabular-nums text-slate-900 shadow ring-2 ring-black/25">
          {p.number ?? ""}
        </div>
        {p.rating != null && (
          <span
            className="absolute -right-2 -top-1 rounded px-1 text-[9px] font-bold leading-tight text-white shadow"
            style={{ backgroundColor: ratingColor(p.rating) }}
          >
            {p.rating.toFixed(1)}
          </span>
        )}
        {p.goals > 0 && <span className="absolute -left-2 -top-1.5 text-[10px]">⚽</span>}
        {p.red > 0 ? (
          <span className="absolute -bottom-1.5 -left-1.5 text-[9px]">🟥</span>
        ) : p.yellow > 0 ? (
          <span className="absolute -bottom-1.5 -left-1.5 text-[9px]">🟨</span>
        ) : null}
        {p.subbedOut && (
          <span className="absolute -bottom-1.5 -right-1.5 text-[9px] text-red-400">▼</span>
        )}
      </div>
      <span className="mt-0.5 max-w-[64px] truncate text-[9px] font-medium text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
        {shortName(p.name)}
      </span>
    </div>
  );
}

function Pitch({ team }: { team: TeamLineup }) {
  const starters = team.players.filter((p) => p.isStarter).sort((a, b) => a.order - b.order);
  const positions = playerPositions(team.formation ?? "4-4-2");
  const subs = team.players.filter((p) => !p.isStarter).sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Sân cỏ dọc — đội tấn công lên trên (thủ môn ở dưới) */}
      <div
        className="relative w-full overflow-hidden rounded-xl"
        style={{
          aspectRatio: "3 / 4",
          background:
            "repeating-linear-gradient(0deg, #15803d 0, #15803d 12.5%, #16a34a 12.5%, #16a34a 25%)",
        }}
      >
        <svg viewBox="0 0 100 133" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <g fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4">
            <rect x="2" y="2" width="96" height="129" />
            <line x1="2" y1="66.5" x2="98" y2="66.5" />
            <circle cx="50" cy="66.5" r="9" />
            <rect x="30" y="2" width="40" height="18" />
            <rect x="30" y="113" width="40" height="18" />
          </g>
        </svg>

        {starters.slice(0, positions.length).map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className="absolute"
            style={{ left: `${positions[i].x}%`, top: `${100 - positions[i].y}%` }}
          >
            <PlayerMarker p={p} />
          </div>
        ))}
      </div>

      {/* Dự bị */}
      {subs.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Dự bị
          </p>
          <div className="flex flex-wrap gap-1.5">
            {subs.map((s, i) => (
              <span
                key={`${s.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs"
              >
                {s.number != null && <span className="text-muted-foreground tabular-nums">{s.number}</span>}
                <span>{s.name}</span>
                {s.rating != null && (
                  <span className="font-display font-semibold tabular-nums" style={{ color: ratingColor(s.rating) }}>
                    {s.rating.toFixed(1)}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LineupPitch({ home, away }: { home: TeamLineup; away: TeamLineup }) {
  const [side, setSide] = useState<"HOME" | "AWAY">("HOME");
  const team = side === "HOME" ? home : away;

  const ratingSource =
    [...home.players, ...away.players].find((p) => p.rating != null && p.ratingSource)?.ratingSource ??
    null;

  const sides = [
    { value: "HOME" as const, team: home },
    { value: "AWAY" as const, team: away },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {sides.map(({ value, team: t }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSide(value)}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
              side === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-foreground hover:bg-primary/5"
            }`}
          >
            <span>{t.flag ?? "🏳️"}</span>
            <span className="truncate">{t.teamName}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Sơ đồ: <span className="font-semibold text-foreground">{team.formation ?? "—"}</span>
        </span>
        {ratingSource && (
          <span className="text-[10px] text-muted-foreground">Chấm điểm: {ratingSource}</span>
        )}
      </div>

      <Pitch team={team} />
    </div>
  );
}
