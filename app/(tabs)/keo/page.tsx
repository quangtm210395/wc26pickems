import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/economy";
import { vnTime, vnDateKey, vnDateLabel } from "@/lib/matches";
import { Card, CardContent } from "@/components/ui/card";
import { BetButtons } from "@/components/bet-buttons";
import { BetDetailCard } from "@/components/bet-detail-card";
import { MARKET_TYPE_LABEL } from "@/lib/bet-display";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBalance(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function KeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Kèo tạm ẩn: tỉ lệ hiện là mock. Bật lại bằng env BETTING_ENABLED="true"
  // khi đã có dữ liệu/odds thật.
  if (process.env.BETTING_ENABLED !== "true") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <span className="text-4xl">🚧</span>
            <h1 className="font-display text-lg font-bold uppercase tracking-tight">
              Kèo đang bảo trì
            </h1>
            <p className="text-sm text-muted-foreground">
              Tính năng cá cược điểm ảo đang được nâng cấp với dữ liệu &amp; tỉ lệ thật. Quay lại
              sớm nhé! Trong lúc đó, bạn vẫn chơi <strong>Pickems</strong> để leo bảng xếp hạng.
            </p>
            <Link
              href="/pickems"
              className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-display text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/15"
            >
              🎯 Chơi Pickems
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = await auth();

  // Logged-out gate
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl">🎲</span>
            <h1 className="font-display text-lg font-bold uppercase tracking-tight">Kèo cá cược</h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để chơi kèo &amp; đặt cược điểm ảo.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-[0_2px_16px_-6px_rgba(231,180,58,0.7)] transition-colors hover:bg-primary/90"
            >
              Đăng nhập
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  // Fetch data in parallel
  const [balance, userBets, openMatches] = await Promise.all([
    getBalance(userId),

    // User's bets (newest first), with market + match + teams
    prisma.bet.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        market: {
          include: {
            selections: true,
            match: {
              include: { homeTeam: true, awayTeam: true },
            },
          },
        },
      },
    }),

    // Scheduled matches (kickoff > now) that have markets
    prisma.match.findMany({
      where: {
        status: "SCHEDULED",
        kickoff: { gt: now },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
        markets: { some: { status: "OPEN" } },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        markets: {
          where: { status: "OPEN" },
          include: { selections: true },
          orderBy: { type: "asc" },
        },
      },
      orderBy: { kickoff: "asc" },
    }),
  ]);

  // Group open matches by day
  type DayGroup = { key: string; label: string; matches: typeof openMatches };
  const dayMap = new Map<string, (typeof openMatches)[number][]>();
  for (const m of openMatches) {
    const k = vnDateKey(m.kickoff);
    let arr = dayMap.get(k);
    if (!arr) {
      arr = [];
      dayMap.set(k, arr);
    }
    arr.push(m);
  }
  const dayGroups: DayGroup[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, matches]) => ({ key, label: vnDateLabel(matches[0].kickoff), matches }));

  // Tách kèo ĐANG CHỜ vs LỊCH SỬ (đã xử lý) cho đỡ rối; mặc định xem kèo đang đặt.
  const pendingBets = userBets.filter((b) => b.status === "PENDING");
  const settledBets = userBets.filter((b) => b.status !== "PENDING");
  const { tab } = await searchParams;
  const betTab = tab === "lich-su" ? "lich-su" : "dang-dat";
  const shownBets = betTab === "lich-su" ? settledBets : pendingBets;

  return (
    <div className="space-y-4">
      {/* Header card: balance */}
      <Card className="ring-primary/15">
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Số dư</p>
              <p className="font-display text-2xl font-bold tabular-nums text-primary">{formatBalance(balance)}</p>
            </div>
            <p className="text-xs text-muted-foreground">điểm ảo, chơi vui</p>
          </div>
        </CardContent>
      </Card>

      {/* Pool dự đoán vô địch */}
      <Link href="/vo-dich" className="block">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent transition-colors hover:from-primary/15">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-primary">🏆 Pool dự đoán vô địch</p>
              <p className="truncate text-xs text-muted-foreground">
                Đặt điểm đoán nhà vô địch — trúng chia cả pool!
              </p>
            </div>
            <span className="shrink-0 text-muted-foreground">›</span>
          </CardContent>
        </Card>
      </Link>

      {/* Section: My bets — tách Đang đặt / Lịch sử cho đỡ rối */}
      {userBets.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-heading sticky top-14 z-10 bg-background/90 py-1.5 backdrop-blur">
            Kèo của tôi
          </h2>
          <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-0.5 text-xs">
            <Link
              href="/keo?tab=dang-dat"
              className={`inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 font-display font-medium uppercase tracking-wide transition-colors ${
                betTab === "dang-dat"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/5"
              }`}
            >
              Đang đặt ({pendingBets.length})
            </Link>
            <Link
              href="/keo?tab=lich-su"
              className={`inline-flex min-h-[40px] items-center justify-center rounded-lg px-3 font-display font-medium uppercase tracking-wide transition-colors ${
                betTab === "lich-su"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-primary/5"
              }`}
            >
              Lịch sử ({settledBets.length})
            </Link>
          </div>
          {shownBets.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {betTab === "lich-su" ? "Chưa có kèo đã xử lý." : "Chưa có kèo đang chờ."}
            </p>
          ) : (
            <div className="space-y-2">
              {shownBets.map((bet) => (
                <BetDetailCard key={bet.id} bet={bet} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Section: Open markets */}
      <section className="space-y-2">
        <h2 className="section-heading sticky top-14 z-10 bg-background/90 py-1.5 backdrop-blur">
          Kèo đang mở
        </h2>

        {dayGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có kèo nào đang mở.</p>
        ) : (
          dayGroups.map((day) => (
            <section key={day.key} className="space-y-2">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {day.label}
              </h3>
              {day.matches.map((match) => (
                <div key={match.id} className="rounded-xl border border-border bg-card p-3 space-y-3">
                  {/* Match header */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                      <span className="text-xl leading-none">{match.homeTeam?.flag ?? "🏳️"}</span>
                      <span className="truncate text-sm font-medium">
                        {match.homeTeam?.name ?? "TBD"}
                      </span>
                    </div>
                    <div className="flex min-w-[60px] flex-col items-center text-center">
                      <span className="font-display text-base font-semibold leading-none tabular-nums">
                        {vnTime(match.kickoff)}
                      </span>
                      <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {match.groupName ? `Bảng ${match.groupName}` : match.stage}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-row-reverse items-center gap-1.5 overflow-hidden text-right">
                      <span className="text-xl leading-none">{match.awayTeam?.flag ?? "🏳️"}</span>
                      <span className="truncate text-sm font-medium">
                        {match.awayTeam?.name ?? "TBD"}
                      </span>
                    </div>
                  </div>

                  {/* Markets */}
                  <div className="space-y-2">
                    {match.markets.map((market) => (
                      <div key={market.id}>
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {MARKET_TYPE_LABEL[market.type]}
                          {market.line != null && (
                            <span className="ml-1 text-muted-foreground">({market.line})</span>
                          )}
                        </p>
                        <BetButtons
                          marketId={market.id}
                          selections={market.selections.map((s) => ({
                            key: s.key,
                            label: s.label,
                            odds: s.odds,
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </section>
    </div>
  );
}
