import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/economy";
import { getPoolStatus, getPoolStats, POOL_MIN_STAKE } from "@/lib/champion";
import { vnDateLabel, vnTime } from "@/lib/matches";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { placeChampionBetAction } from "./actions";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

export default async function VoDichPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const session = await auth();
  const uid = session?.user?.id ?? null;

  const [status, stats, balance, teams] = await Promise.all([
    getPoolStatus(),
    getPoolStats(uid ?? undefined),
    uid ? getBalance(uid) : Promise.resolve(0),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, flag: true } }),
  ]);

  const myTeamTotal = stats.myBet
    ? (stats.teams.find((t) => t.teamId === stats.myBet!.teamId)?.total ?? stats.myBet.stake)
    : 0;
  const myEstimate =
    stats.myBet && myTeamTotal > 0
      ? Math.floor((stats.totalPool * stats.myBet.stake) / myTeamTotal)
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-2xl">🏆</span> Pool dự đoán vô địch
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bỏ điểm dự đoán đội vô địch World Cup 2026. Cuối giải, ai đoán trúng sẽ{" "}
          <strong>chia nhau toàn bộ pool</strong> theo tỉ lệ điểm đã đặt.
        </p>
      </div>

      {/* Trạng thái pool */}
      <Card className="ring-primary/15">
        <CardContent className="flex items-center justify-between gap-3 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tổng pool</p>
            <p className="font-display text-3xl font-bold tabular-nums text-primary">
              {fmt(stats.totalPool)}
            </p>
            <p className="text-xs text-muted-foreground">{stats.totalBettors} người đã đặt</p>
          </div>
          <div className="text-right text-xs">
            {status.settled ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-400">
                Đã chốt
              </span>
            ) : status.open ? (
              <span className="rounded-full bg-primary/15 px-2 py-1 font-semibold text-primary">
                Đang mở
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-1 font-semibold text-muted-foreground">
                Đã đóng
              </span>
            )}
            {status.deadline && !status.settled && (
              <p className="mt-1 text-muted-foreground">
                Đóng: {vnTime(status.deadline)} {vnDateLabel(status.deadline)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Đã đặt vào pool! Chúc may mắn 🍀
        </p>
      )}

      {/* Cược của tôi */}
      {stats.myBet && (
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Dự đoán của bạn</p>
            <p className="text-lg font-semibold">
              {stats.myBet.teamFlag ?? "🏳️"} {stats.myBet.teamName} ·{" "}
              <span className="text-primary">{fmt(stats.myBet.stake)}</span>
            </p>
            {stats.myBet.status === "PENDING" ? (
              <p className="text-sm text-muted-foreground">
                Nếu vô địch, bạn nhận ~
                <strong className="text-emerald-400">{fmt(myEstimate)}</strong> (đổi theo lượng đặt)
              </p>
            ) : stats.myBet.status === "WON" ? (
              <p className="text-sm font-semibold text-emerald-400">
                🎉 Trúng! Nhận {fmt(stats.myBet.payout ?? 0)}
              </p>
            ) : stats.myBet.status === "VOID" ? (
              <p className="text-sm text-muted-foreground">Pool huỷ — đã hoàn điểm.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Tiếc quá, lần sau nhé!</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Đặt / nạp thêm */}
      {uid && status.open && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
              {stats.myBet ? `Nạp thêm vào ${stats.myBet.teamName}` : "Đặt dự đoán"}
            </h2>
            <p className="text-xs text-muted-foreground">Số dư: {fmt(balance)}</p>
            <form action={placeChampionBetAction} className="space-y-3">
              {stats.myBet ? (
                <input type="hidden" name="teamId" value={stats.myBet.teamId} />
              ) : (
                <select
                  name="teamId"
                  required
                  defaultValue=""
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/40"
                >
                  <option value="" disabled>
                    — Chọn đội vô địch —
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.flag ?? "🏳️"} {t.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <input
                  name="stake"
                  type="number"
                  min={POOL_MIN_STAKE}
                  step={50}
                  required
                  placeholder={`Số điểm (tối thiểu ${POOL_MIN_STAKE})`}
                  className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/40"
                />
                <Button type="submit" className="h-11 shrink-0 px-5">
                  Đặt
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!uid && (
        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground"
        >
          Đăng nhập để tham gia
        </Link>
      )}

      {/* Phân bổ theo đội */}
      <div className="space-y-1.5">
        <h2 className="section-heading">Cửa đang được đặt nhiều</h2>
        {stats.teams.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Chưa có ai đặt. Là người mở hàng nào! 🥇
            </CardContent>
          </Card>
        ) : (
          stats.teams.map((t) => {
            const pct = stats.totalPool > 0 ? Math.round((t.total / stats.totalPool) * 100) : 0;
            return (
              <div key={t.teamId} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">
                    {t.flag ?? "🏳️"} {t.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {fmt(t.total)} · {pct}% · {t.count} người
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Điểm ảo · chơi cho vui · chốt khi có nhà vô địch
      </p>
    </div>
  );
}
