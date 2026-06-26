import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMatchById, vnDateLabel, vnTime } from "@/lib/matches";
import { PickBadge } from "@/components/pick-badge";
import { BetDetailCard } from "@/components/bet-detail-card";
import { MatchMarkets } from "@/components/match-markets";
import { LineupPitch, type TeamLineup, type PitchPlayer } from "@/components/lineup-pitch";

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home?: number | null;
  away?: number | null;
}) {
  if (home == null && away == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="w-10 text-left font-semibold tabular-nums">{home ?? "-"}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="w-10 text-right font-semibold tabular-nums">{away ?? "-"}</span>
    </div>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMatchById(id);
  if (!m) notFound();

  // Dữ liệu của user cho trận này: pickems + kèo đã đặt.
  const session = await auth();
  const userId = session?.user?.id;
  const myPick = userId
    ? await prisma.pick.findUnique({ where: { userId_matchId: { userId, matchId: id } } })
    : null;
  const myBets = userId
    ? await prisma.bet.findMany({
        where: { userId, market: { matchId: id } },
        orderBy: { createdAt: "desc" },
        include: {
          market: {
            include: {
              selections: true,
              match: { include: { homeTeam: true, awayTeam: true } },
            },
          },
        },
      })
    : [];

  // Kèo đang mở của trận này — cho đặt cược ngay trong trang trận (gate bằng BETTING_ENABLED như tab Kèo).
  const bettingOn = process.env.BETTING_ENABLED === "true";
  const openMarkets = bettingOn
    ? await prisma.market.findMany({
        where: { matchId: id, status: "OPEN" },
        include: { selections: true },
        orderBy: { type: "asc" },
      })
    : [];

  // Đội hình ra sân (dữ liệu cấu trúc) — để vẽ sân + chấm điểm; thiếu thì fallback text bên dưới.
  const players = await prisma.matchPlayer.findMany({
    where: { matchId: id },
    orderBy: [{ isStarter: "desc" }, { order: "asc" }],
  });
  const hasLineup = players.length > 0;
  const toPitch = (p: (typeof players)[number]): PitchPlayer => ({
    name: p.name,
    number: p.number,
    isStarter: p.isStarter,
    order: p.order,
    rating: p.rating,
    ratingSource: p.ratingSource,
    goals: p.goals,
    assists: p.assists,
    yellow: p.yellow,
    red: p.red,
    subbedOut: p.subbedOut,
  });
  const homeLineup: TeamLineup = {
    teamName: m.homeTeam?.name ?? "Đội nhà",
    flag: m.homeTeam?.flag ?? null,
    formation: m.homeFormation,
    players: players.filter((p) => p.team === "HOME").map(toPitch),
  };
  const awayLineup: TeamLineup = {
    teamName: m.awayTeam?.name ?? "Đội khách",
    flag: m.awayTeam?.flag ?? null,
    formation: m.awayFormation,
    players: players.filter((p) => p.team === "AWAY").map(toPitch),
  };

  const done = m.status === "FINISHED";
  const live = m.status === "LIVE";
  const s = m.stats;

  return (
    <div className="space-y-5">
      <Link href="/lich" className="text-xs text-muted-foreground">
        ← Lịch thi đấu
      </Link>

      <div className="text-center text-xs text-muted-foreground">
        {m.groupName ? `Bảng ${m.groupName}` : m.stage} · {vnDateLabel(m.kickoff)} · {vnTime(m.kickoff)}
      </div>

      <div className="flex items-center justify-around gap-2">
        {m.homeTeam ? (
          <Link
            href={`/team/${m.homeTeam.id}`}
            className="flex flex-1 flex-col items-center gap-1 transition-opacity hover:opacity-80"
          >
            <span className="text-4xl">{m.homeTeam.flag ?? "🏳️"}</span>
            <span className="text-center text-sm font-medium">{m.homeTeam.name}</span>
          </Link>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl">🏳️</span>
            <span className="text-center text-sm font-medium">TBD</span>
          </div>
        )}
        <div className="px-2 text-center">
          {done || live ? (
            <div className="text-3xl font-bold tabular-nums">
              {m.homeScore} - {m.awayScore}
            </div>
          ) : (
            <div className="text-2xl font-bold tabular-nums">{vnTime(m.kickoff)}</div>
          )}
          <div className={`text-[11px] uppercase ${live ? "font-semibold text-red-500" : "text-muted-foreground"}`}>
            {live ? "● Live" : done ? "Kết thúc" : "Sắp diễn ra"}
          </div>
          {m.homePens != null && (
            <div className="text-[11px] text-muted-foreground">
              pen {m.homePens}-{m.awayPens}
            </div>
          )}
        </div>
        {m.awayTeam ? (
          <Link
            href={`/team/${m.awayTeam.id}`}
            className="flex flex-1 flex-col items-center gap-1 transition-opacity hover:opacity-80"
          >
            <span className="text-4xl">{m.awayTeam.flag ?? "🏳️"}</span>
            <span className="text-center text-sm font-medium">{m.awayTeam.name}</span>
          </Link>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-4xl">🏳️</span>
            <span className="text-center text-sm font-medium">TBD</span>
          </div>
        )}
      </div>

      {m.venue && <p className="text-center text-xs text-muted-foreground">🏟️ {m.venue}</p>}

      {bettingOn && openMarkets.length > 0 && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
            🎲 Kèo trận này
          </h2>
          {userId ? (
            <MatchMarkets markets={openMarkets} />
          ) : (
            <Link
              href="/login"
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-primary/10 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              Đăng nhập để đặt kèo trận này →
            </Link>
          )}
        </div>
      )}

      {userId && (myPick || myBets.length > 0) && (
        <div className="space-y-3 rounded-lg border p-3">
          <h2 className="text-center text-xs font-semibold uppercase text-muted-foreground">
            Dự đoán &amp; kèo của tôi
          </h2>
          {myPick && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Pickems · dự đoán 1x2</span>
              <PickBadge pick={myPick} />
            </div>
          )}
          {myBets.length > 0 && (
            <div className="space-y-2">
              {myBets.map((b) => (
                <BetDetailCard key={b.id} bet={b} showMatch={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {s && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            Thông số trận đấu
          </h2>
          <StatRow label="Sút" home={s.homeShots} away={s.awayShots} />
          <StatRow label="Phạt góc" home={s.homeCorners} away={s.awayCorners} />
          <StatRow label="Thẻ vàng" home={s.homeYellow} away={s.awayYellow} />
          <StatRow label="Thẻ đỏ" home={s.homeRed} away={s.awayRed} />
          <StatRow label="Kiểm soát %" home={s.homePoss} away={s.awayPoss} />
        </div>
      )}

      {hasLineup ? (
        <div className="rounded-lg border p-3">
          <h2 className="mb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
            Đội hình ra sân
          </h2>
          <LineupPitch home={homeLineup} away={awayLineup} />
        </div>
      ) : (
        (m.homeLineup || m.awayLineup) && (
          <div className="rounded-lg border p-3">
            <h2 className="mb-2 text-center text-xs font-semibold uppercase text-muted-foreground">
              Đội hình ra sân
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {m.homeLineup && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <span>{m.homeTeam?.flag ?? "🏳️"}</span>
                    <span>{m.homeTeam?.name ?? "Đội nhà"}</span>
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {m.homeLineup}
                  </p>
                </div>
              )}
              {m.awayLineup && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
                    <span>{m.awayTeam?.flag ?? "🏳️"}</span>
                    <span>{m.awayTeam?.name ?? "Đội khách"}</span>
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {m.awayLineup}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {m.preview && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Trước trận</h2>
          <p className="text-sm leading-relaxed">{m.preview}</p>
        </div>
      )}

      {!done && !s && (
        <p className="text-center text-xs text-muted-foreground">
          Thông số sẽ cập nhật sau khi trận kết thúc.
        </p>
      )}
    </div>
  );
}
