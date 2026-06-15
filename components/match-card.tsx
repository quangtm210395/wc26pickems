import Link from "next/link";
import { vnTime, type MatchWithTeams } from "@/lib/matches";

function TeamSide({
  team,
  align,
}: {
  team: MatchWithTeams["homeTeam"];
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-1 items-center gap-2 overflow-hidden ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <span className="text-xl leading-none">{team?.flag ?? "🏳️"}</span>
      <span className="truncate text-sm font-medium">{team?.name ?? "TBD"}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: MatchWithTeams }) {
  const done = match.status === "FINISHED";
  const live = match.status === "LIVE";
  return (
    <Link
      href={`/match/${match.id}`}
      className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 active:border-primary/50 active:bg-primary/5"
    >
      <TeamSide team={match.homeTeam} align="right" />
      <div className="flex min-w-[64px] flex-col items-center">
        {done || live ? (
          <span
            className={`font-display text-lg font-bold leading-none tabular-nums ${live ? "text-foreground" : "text-foreground"}`}
          >
            {match.homeScore}
            <span className="mx-0.5 text-muted-foreground">-</span>
            {match.awayScore}
          </span>
        ) : (
          <span className="font-display text-base font-semibold leading-none tabular-nums text-foreground">
            {vnTime(match.kickoff)}
          </span>
        )}
        {live ? (
          <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-destructive">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-destructive" />
            </span>
            Live
          </span>
        ) : done ? (
          <span className="mt-1 rounded-full bg-muted px-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            FT
          </span>
        ) : match.groupName ? (
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Bảng {match.groupName}
          </span>
        ) : null}
      </div>
      <TeamSide team={match.awayTeam} align="left" />
    </Link>
  );
}
