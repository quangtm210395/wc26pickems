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
      className="flex items-center gap-2 rounded-lg border bg-card p-3 transition-colors active:bg-accent"
    >
      <TeamSide team={match.homeTeam} align="right" />
      <div className="flex min-w-[60px] flex-col items-center">
        {done || live ? (
          <span className="text-base font-bold tabular-nums">
            {match.homeScore}-{match.awayScore}
          </span>
        ) : (
          <span className="text-sm font-semibold tabular-nums">{vnTime(match.kickoff)}</span>
        )}
        <span
          className={`text-[10px] uppercase ${live ? "font-semibold text-red-500" : "text-muted-foreground"}`}
        >
          {live ? "● Live" : done ? "FT" : match.groupName ? `Bảng ${match.groupName}` : ""}
        </span>
      </div>
      <TeamSide team={match.awayTeam} align="left" />
    </Link>
  );
}
