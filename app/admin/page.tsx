import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllMatches } from "@/lib/matches";
import { getDraftPosts } from "@/lib/posts";
import { Card, CardContent } from "@/components/ui/card";
import { AdminMatchForm } from "@/components/admin-match-form";
import { AdminPublishButton } from "@/components/admin-publish-button";
import { AdminBalanceForm } from "@/components/admin-balance-form";
import type { MatchWithTeams } from "@/lib/matches";

function NotAuthorized() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-4xl">🔒</span>
          <h1 className="text-lg font-semibold">Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Bạn không có quyền truy cập trang admin.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Về trang chủ
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function pickNearMatches(matches: MatchWithTeams[], n = 20): MatchWithTeams[] {
  const now = Date.now();
  // Sort by distance from now
  return [...matches]
    .sort((a, b) => {
      const da = Math.abs(a.kickoff.getTime() - now);
      const db = Math.abs(b.kickoff.getTime() - now);
      return da - db;
    })
    .slice(0, n)
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
}

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== "admin") {
    return <NotAuthorized />;
  }

  // Fetch all data in parallel
  const [allMatches, draftPosts, topUsers] = await Promise.all([
    getAllMatches(),
    getDraftPosts(),
    prisma.user.findMany({
      orderBy: { balance: "desc" },
      take: 50,
      select: { id: true, name: true, balance: true },
    }),
  ]);

  // Fetch stats for matches with both teams
  const matchesWithTeams = allMatches.filter((m) => m.homeTeamId && m.awayTeamId);
  const nearMatches = pickNearMatches(matchesWithTeams);

  const matchIds = nearMatches.map((m) => m.id);
  const statsRows = await prisma.matchStats.findMany({
    where: { matchId: { in: matchIds } },
  });
  const statsMap = new Map(statsRows.map((s) => [s.matchId, s]));

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-xl font-bold">⚙️ Trang Admin</h1>
        <p className="text-sm text-muted-foreground">Chào {session.user.name ?? session.user.email}</p>
      </div>

      {/* ── Matches ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Trận đấu (gần nhất {nearMatches.length})</h2>
        {nearMatches.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Chưa có trận nào có đủ 2 đội.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {nearMatches.map((match) => {
              const s = statsMap.get(match.id) ?? null;
              return (
                <AdminMatchForm
                  key={match.id}
                  matchId={match.id}
                  homeTeamName={match.homeTeam?.name ?? "Nhà"}
                  awayTeamName={match.awayTeam?.name ?? "Khách"}
                  currentStatus={match.status}
                  currentHomeScore={match.homeScore}
                  currentAwayScore={match.awayScore}
                  currentHomePens={match.homePens}
                  currentAwayPens={match.awayPens}
                  currentStats={
                    s
                      ? {
                          homeCorners: s.homeCorners,
                          awayCorners: s.awayCorners,
                          homeYellow: s.homeYellow,
                          awayYellow: s.awayYellow,
                          homeRed: s.homeRed,
                          awayRed: s.awayRed,
                          homeShots: s.homeShots,
                          awayShots: s.awayShots,
                          homePoss: s.homePoss,
                          awayPoss: s.awayPoss,
                        }
                      : null
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* ── Draft Posts ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Bài chờ duyệt</h2>
        {draftPosts.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Không có bài nháp.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {draftPosts.map((post) => (
              <AdminPublishButton key={post.id} postId={post.id} title={post.title} />
            ))}
          </div>
        )}
      </section>

      {/* ── Users / Balance ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Người chơi (top 50 theo số dư)</h2>
        {topUsers.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Chưa có người chơi.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {topUsers.map((user) => (
              <AdminBalanceForm
                key={user.id}
                userId={user.id}
                userName={user.name}
                balance={user.balance}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
