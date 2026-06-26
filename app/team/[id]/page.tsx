import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeGroupStandings } from "@/lib/standings";
import { computeTeamStats } from "@/lib/team-stats";
import { StandingsTable } from "@/components/standings-table";
import { MatchCard } from "@/components/match-card";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card py-2 text-center">
      <p className="font-display text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-foreground/80">
      <span className="h-3.5 w-0.5 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const team = await prisma.team.findUnique({ where: { id }, include: { group: true } });
  if (!team) notFound();

  const matches = await prisma.match.findMany({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
    include: { homeTeam: true, awayTeam: true, stats: true },
    orderBy: { kickoff: "asc" },
  });

  const groupName = team.group?.name ?? matches.find((m) => m.stage === "GROUP")?.groupName ?? null;
  let standings: ReturnType<typeof computeGroupStandings> = [];
  if (groupName) {
    const groupMatches = await prisma.match.findMany({
      where: { groupName, stage: "GROUP" },
      include: { homeTeam: true, awayTeam: true },
    });
    standings = computeGroupStandings(groupMatches);
  }

  const stats = computeTeamStats(id, matches);
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" || m.status === "LIVE")
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  const results = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => b.kickoff.getTime() - a.kickoff.getTime());

  return (
    <div className="space-y-5">
      <Link href="/lich" className="text-xs text-muted-foreground">
        ← Lịch thi đấu
      </Link>

      {/* Header */}
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-6xl leading-none">{team.flag ?? "🏳️"}</span>
        <h1 className="text-2xl font-bold">{team.name}</h1>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {team.code}
          {groupName ? ` · Bảng ${groupName}` : ""}
        </p>
      </div>

      {/* Thông số */}
      {stats.played > 0 && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
            Thông số ({stats.played} trận)
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="T - H - B" value={`${stats.won}-${stats.drawn}-${stats.lost}`} />
            <Stat
              label="Bàn (HS)"
              value={`${stats.goalsFor}:${stats.goalsAgainst} (${stats.goalDiff >= 0 ? "+" : ""}${stats.goalDiff})`}
            />
            <Stat label="Sạch lưới" value={stats.cleanSheets} />
            <Stat label="Dứt điểm" value={stats.shots} />
            <Stat label="Phạt góc" value={stats.corners} />
            <Stat label="Thẻ V / Đỏ" value={`${stats.yellow} / ${stats.red}`} />
            {stats.avgPoss != null && <Stat label="Kiểm soát TB" value={`${stats.avgPoss}%`} />}
          </div>
        </div>
      )}

      {/* Bảng đấu */}
      {standings.length > 0 && (
        <div className="space-y-2">
          <SectionHeading>Bảng {groupName}</SectionHeading>
          <StandingsTable rows={standings} highlightTeamId={id} />
        </div>
      )}

      {/* Lịch thi đấu (sắp tới) */}
      {upcoming.length > 0 && (
        <section className="space-y-2">
          <SectionHeading>Lịch thi đấu</SectionHeading>
          <div className="space-y-2">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* Kết quả / lịch sử */}
      {results.length > 0 && (
        <section className="space-y-2">
          <SectionHeading>Kết quả gần đây</SectionHeading>
          <div className="space-y-2">
            {results.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {matches.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Đội này chưa có trận nào.</p>
      )}
    </div>
  );
}
