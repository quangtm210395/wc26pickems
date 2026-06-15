import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getBalance } from "@/lib/economy";
import { getActiveLoan } from "@/lib/wallet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NapDiemCard, LoanCard } from "@/components/wallet-actions";
import type { TxType } from "@prisma/client";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const TX_LABELS: Record<TxType, string> = {
  WELCOME: "Thưởng đăng ký",
  PICKEM_WIN: "Pickems đúng",
  DRIP: "Điểm hằng ngày",
  BET_STAKE: "Đặt cược",
  BET_WIN: "Thắng kèo",
  LOAN: "Vay",
  REPAY: "Trả nợ",
  SHARE: "Chia sẻ MXH",
  AD: "Quảng cáo",
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
            <h1 className="text-lg font-semibold">Ví điểm của bạn</h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để xem ví và nhận điểm hằng ngày.
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

  const [balance, activeLoan, txns] = await Promise.all([
    getBalance(userId),
    getActiveLoan(userId),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const activeLoanOutstanding = activeLoan ? activeLoan.outstanding : null;

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Số dư</p>
          <p className="text-4xl font-bold tabular-nums">
            {fmt(balance)}
            <span className="text-2xl font-semibold">đ</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">điểm ảo, chơi cho vui</p>
        </CardContent>
      </Card>

      {/* Claim actions */}
      <NapDiemCard />

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
                return (
                  <li key={tx.id} className="flex items-center gap-2 py-2.5">
                    {/* Left: label + note */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{TX_LABELS[tx.type]}</p>
                      {tx.note && (
                        <p className="text-xs text-muted-foreground truncate">{tx.note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">{txTime(tx.createdAt)}</p>
                    </div>
                    {/* Right: amount + balanceAfter */}
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          isPositive
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-500 dark:text-red-400"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {fmt(tx.amount)}đ
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
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
