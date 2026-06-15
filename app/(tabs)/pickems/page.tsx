import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/economy";
import { getAllMatches, groupByDay, vnTime, type MatchWithTeams } from "@/lib/matches";
import { Card, CardContent } from "@/components/ui/card";
import { PickButtons } from "@/components/pick-buttons";
import type { Pick, PickChoice } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPickable(match: MatchWithTeams): boolean {
  return match.status === "SCHEDULED" && match.kickoff > new Date();
}

function formatBalance(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

// ─── Pick status badge ────────────────────────────────────────────────────────

function PickBadge({ pick, points }: { pick: Pick | undefined; points?: number }) {
  if (!pick) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">
        Không dự đoán
      </span>
    );
  }
  const choiceLabel: Record<PickChoice, string> = { HOME: "Nhà", DRAW: "Hòa", AWAY: "Khách" };
  if (pick.status === "WON") {
    return (
      <span className="flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {choiceLabel[pick.choice]} · WON +{points ?? pick.points}đ
      </span>
    );
  }
  if (pick.status === "LOST") {
    return (
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {choiceLabel[pick.choice]} · Thua
      </span>
    );
  }
  // PENDING
  return (
    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      {choiceLabel[pick.choice]} · Đang chờ
    </span>
  );
}

// ─── Match row ────────────────────────────────────────────────────────────────

function MatchPickRow({
  match,
  pick,
}: {
  match: MatchWithTeams;
  pick: Pick | undefined;
}) {
  const pickable = isPickable(match);
  const done = match.status === "FINISHED";
  const live = match.status === "LIVE";

  return (
    <div className="rounded-lg border bg-card p-3">
      {/* Teams row */}
      <div className="flex items-center gap-2">
        {/* Home */}
        <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
          <span className="text-xl leading-none">{match.homeTeam?.flag ?? "🏳️"}</span>
          <span className="truncate text-sm font-medium">{match.homeTeam?.name ?? "TBD"}</span>
        </div>
        {/* Center */}
        <div className="flex min-w-[60px] flex-col items-center">
          {done || live ? (
            <span className="text-base font-bold tabular-nums">
              {match.homeScore}-{match.awayScore}
            </span>
          ) : (
            <span className="text-sm font-semibold tabular-nums">{vnTime(match.kickoff)}</span>
          )}
          <span
            className={`text-[10px] uppercase ${
              live
                ? "font-semibold text-red-500"
                : done
                ? "text-muted-foreground"
                : "text-muted-foreground"
            }`}
          >
            {live ? "● Live" : done ? "FT" : match.groupName ? `Bảng ${match.groupName}` : match.stage}
          </span>
        </div>
        {/* Away */}
        <div className="flex flex-1 flex-row-reverse items-center gap-1.5 overflow-hidden text-right">
          <span className="text-xl leading-none">{match.awayTeam?.flag ?? "🏳️"}</span>
          <span className="truncate text-sm font-medium">{match.awayTeam?.name ?? "TBD"}</span>
        </div>
      </div>

      {/* Pick area */}
      {pickable ? (
        <PickButtons
          matchId={match.id}
          stage={match.stage}
          current={pick?.choice ?? null}
          homeLabel={match.homeTeam?.name ?? "Nhà"}
          awayLabel={match.awayTeam?.name ?? "Khách"}
        />
      ) : (
        <div className="flex items-center justify-between pt-2">
          <PickBadge pick={pick} />
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PickemsPage() {
  const session = await auth();

  // Logged-out gate
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl">🏆</span>
            <h1 className="text-lg font-semibold">Dự đoán World Cup 2026</h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để dự đoán kết quả trận đấu &amp; leo bảng xếp hạng.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Đăng nhập
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = session.user.id;

  // Fetch data in parallel
  const [balance, matches, userPicks] = await Promise.all([
    getBalance(userId),
    getAllMatches(),
    prisma.pick.findMany({ where: { userId } }),
  ]);

  const pickMap = new Map<string, Pick>(userPicks.map((p) => [p.matchId, p]));
  const totalPicked = userPicks.length;
  const totalPoints = userPicks
    .filter((p) => p.status === "WON")
    .reduce((sum, p) => sum + p.points, 0);

  const days = groupByDay(matches);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Số dư</p>
              <p className="text-xl font-bold tabular-nums">{formatBalance(balance)}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Đã dự đoán: {totalPicked} trận</p>
              <p>Điểm từ pickems: {totalPoints.toLocaleString("vi-VN")}đ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match list grouped by day */}
      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có trận nào.</p>
      ) : (
        days.map((day) => (
          <section key={day.key} className="space-y-2">
            <h2 className="sticky top-14 z-10 bg-background/95 py-1 text-sm font-semibold text-muted-foreground backdrop-blur">
              {day.label}
            </h2>
            <div className="space-y-2">
              {day.matches.map((match) => (
                <MatchPickRow
                  key={match.id}
                  match={match}
                  pick={pickMap.get(match.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
