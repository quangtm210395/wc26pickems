import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/economy";
import { getActiveLoan } from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckinCard, LoanCard } from "@/components/wallet-actions";
import { ReferralCard } from "@/components/referral-card";
import { getOrCreateReferralCode, getReferralCount } from "@/lib/referral";
import { getCheckinState } from "@/lib/checkin";
import type { TxType } from "@prisma/client";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const TX_LABELS: Record<TxType, string> = {
  WELCOME: "Thưởng đăng ký",
  PICKEM_WIN: "Pickems đúng",
  DRIP: "Điểm hằng ngày",
  BET_STAKE: "Đặt cược",
  BET_WIN: "Thắng kèo",
  BET_REFUND: "Hoàn cược (hủy kèo)",
  LOAN: "Vay",
  REPAY: "Trả nợ",
  SHARE: "Chia sẻ MXH",
  AD: "Quảng cáo",
  REFERRAL: "Mời bạn",
  REFERRED: "Thưởng giới thiệu",
  ADJUST: "Điều chỉnh",
};

function txTime(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

export default async function ViPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl">💰</span>
            <h1 className="font-display text-lg font-bold uppercase tracking-tight">Ví điểm của bạn</h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để xem ví và nhận điểm hằng ngày.
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

  const [balance, activeLoan, txns, referralCode, referralCount, checkinState] = await Promise.all([
    getBalance(userId),
    getActiveLoan(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    getOrCreateReferralCode(userId),
    getReferralCount(userId),
    getCheckinState(userId),
  ]);

  // Resolve ngữ cảnh cho lịch sử điểm: trận nào (pickem/kèo) hoặc mời/được mời ai.
  const idsBy = (rt: string) => [
    ...new Set(txns.filter((t) => t.refType === rt && t.refId).map((t) => t.refId as string)),
  ];
  const [matchRows, marketRows, refUsers] = await Promise.all([
    prisma.match.findMany({
      where: { id: { in: idsBy("match") } },
      include: { homeTeam: true, awayTeam: true },
    }),
    prisma.market.findMany({
      where: { id: { in: idsBy("market") } },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
    }),
    prisma.user.findMany({
      where: { id: { in: idsBy("referral") } },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const matchMap = new Map(matchRows.map((m) => [m.id, m]));
  const marketMap = new Map(marketRows.map((m) => [m.id, m]));
  const userMap = new Map(refUsers.map((u) => [u.id, u]));

  const teamPair = (m: {
    homeTeam: { name: string } | null;
    awayTeam: { name: string } | null;
  }) => `${m.homeTeam?.name ?? "?"} vs ${m.awayTeam?.name ?? "?"}`;
  const userName = (u: { name: string | null; email: string | null }) =>
    u.name || u.email?.split("@")[0] || "một người bạn";

  function txDetail(tx: (typeof txns)[number]): string | null {
    const id = tx.refId;
    if (tx.refType === "match" && id) {
      const m = matchMap.get(id);
      if (m)
        return m.homeScore != null && m.awayScore != null
          ? `${m.homeTeam?.name ?? "?"} ${m.homeScore}-${m.awayScore} ${m.awayTeam?.name ?? "?"}`
          : teamPair(m);
    }
    if (tx.refType === "market" && id) {
      const mk = marketMap.get(id);
      if (mk) return tx.note ? `${tx.note} · ${teamPair(mk.match)}` : teamPair(mk.match);
    }
    if (tx.refType === "referral" && id) {
      const u = userMap.get(id);
      if (u)
        return tx.type === "REFERRED"
          ? `Qua lời mời của ${userName(u)}`
          : `Mời được ${userName(u)}`;
    }
    return tx.note;
  }

  const activeLoanOutstanding = activeLoan ? activeLoan.outstanding : null;

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <Card className="relative overflow-hidden ring-primary/20">
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(231,180,58,0.16),transparent_70%)]" />
        <CardContent className="relative py-6 text-center">
          <p className="mb-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Số dư</p>
          <p className="font-display text-5xl font-bold leading-none tabular-nums text-primary">
            {fmt(balance)}
            <span className="text-3xl font-semibold">đ</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">điểm ảo, chơi cho vui</p>
        </CardContent>
      </Card>

      {/* Check-in streak */}
      <CheckinCard {...checkinState} />

      {/* Referral */}
      <ReferralCard code={referralCode} count={referralCount} />

      {/* Loan card */}
      <LoanCard activeLoanOutstanding={activeLoanOutstanding} />

      {/* Transaction history */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {txns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Chưa có giao dịch.</p>
          ) : (
            <ul className="divide-y">
              {txns.map((tx) => {
                const isPositive = tx.amount > 0;
                const detail = txDetail(tx);
                return (
                  <li key={tx.id} className="flex items-center gap-2 py-2.5">
                    {/* Left: label + chi tiết nguồn điểm */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{TX_LABELS[tx.type]}</p>
                      {detail && (
                        <p className="text-xs text-muted-foreground truncate">{detail}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{txTime(tx.createdAt)}</p>
                    </div>
                    {/* Right: amount + balanceAfter */}
                    <div className="text-right shrink-0">
                      <p
                        className={`font-display text-sm font-semibold tabular-nums ${
                          isPositive ? "text-emerald-400" : "text-destructive"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {fmt(tx.amount)}đ
                      </p>
                      <p className="font-display text-[10px] text-muted-foreground tabular-nums">
                        {fmt(tx.balanceAfter)}đ
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
