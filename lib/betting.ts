import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import type { MarketType } from "@prisma/client";

export const MIN_STAKE = 50;

export type ResultInput = {
  type: MarketType;
  line: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeYellow?: number | null;
  awayYellow?: number | null;
  homeRed?: number | null;
  awayRed?: number | null;
};

function totalCorners(i: ResultInput): number | null {
  if (i.homeCorners == null || i.awayCorners == null) return null;
  return i.homeCorners + i.awayCorners;
}

function totalCards(i: ResultInput): number | null {
  if (i.homeYellow == null || i.awayYellow == null || i.homeRed == null || i.awayRed == null) {
    return null;
  }
  return i.homeYellow + i.awayYellow + i.homeRed + i.awayRed;
}

/** Selection key thắng, hoặc null nếu chưa đủ dữ liệu để settle (vd thiếu thông số góc/thẻ). */
export function determineMarketResult(i: ResultInput): string | null {
  if (i.homeScore == null || i.awayScore == null) return null;
  switch (i.type) {
    case "MATCH_1X2":
      if (i.homeScore > i.awayScore) return "HOME";
      if (i.homeScore < i.awayScore) return "AWAY";
      return "DRAW";
    case "GOALS_OU": {
      if (i.line == null) return null;
      return i.homeScore + i.awayScore > i.line ? "OVER" : "UNDER";
    }
    case "CORNERS_OU": {
      if (i.line == null) return null;
      const c = totalCorners(i);
      return c == null ? null : c > i.line ? "OVER" : "UNDER";
    }
    case "CARDS_OU": {
      if (i.line == null) return null;
      const c = totalCards(i);
      return c == null ? null : c > i.line ? "OVER" : "UNDER";
    }
    case "CORRECT_SCORE":
      // Trả tỉ số thật dạng "H-A"; settleMarket sẽ map sang "OTHER" nếu không có cửa đó.
      return `${i.homeScore}-${i.awayScore}`;
  }
}

export function fixedPayout(stake: number, odds: number): number {
  return Math.round(stake * odds);
}

/** Parimutuel: chia tổng pool cho người thắng theo tỉ lệ stake. */
export function parimutuelPayout(stake: number, totalPool: number, winningPool: number): number {
  if (winningPool <= 0) return 0;
  return Math.round(stake * (totalPool / winningPool));
}

// ---------- DB ops ----------

export async function placeBet(
  userId: string,
  marketId: string,
  selectionKey: string,
  stake: number,
) {
  return prisma.$transaction(async (tx) => {
    if (!Number.isInteger(stake) || stake < MIN_STAKE) {
      throw new Error(`Cược tối thiểu ${MIN_STAKE}đ`);
    }
    const market = await tx.market.findUnique({
      where: { id: marketId },
      include: { match: true, selections: true },
    });
    if (!market) throw new Error("Không tìm thấy kèo");
    if (market.status !== "OPEN" || market.match.kickoff <= new Date()) {
      throw new Error("Kèo đã đóng");
    }
    const sel = market.selections.find((s) => s.key === selectionKey);
    if (!sel) throw new Error("Lựa chọn không hợp lệ");
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < stake) throw new Error("Số dư không đủ");

    await credit(tx, {
      userId,
      type: "BET_STAKE",
      amount: -stake,
      refType: "market",
      refId: marketId,
      note: `Cược ${sel.label}`,
    });
    return tx.bet.create({
      data: {
        userId,
        marketId,
        selectionKey,
        stake,
        oddsAtBet: market.mode === "FIXED" ? sel.odds : null,
        status: "PENDING",
      },
    });
  });
}

/** Settle 1 kèo của trận FINISHED. Idempotent (bỏ qua nếu đã SETTLED/VOID). */
export async function settleMarket(marketId: string): Promise<{ settled: number; paid: number }> {
  return prisma.$transaction(async (tx) => {
    const market = await tx.market.findUnique({
      where: { id: marketId },
      include: { match: { include: { stats: true } }, selections: true },
    });
    if (!market || market.status === "SETTLED" || market.status === "VOID") {
      return { settled: 0, paid: 0 };
    }
    const match = market.match;
    if (match.status !== "FINISHED") return { settled: 0, paid: 0 };

    const result = determineMarketResult({
      type: market.type,
      line: market.line,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeCorners: match.stats?.homeCorners,
      awayCorners: match.stats?.awayCorners,
      homeYellow: match.stats?.homeYellow,
      awayYellow: match.stats?.awayYellow,
      homeRed: match.stats?.homeRed,
      awayRed: match.stats?.awayRed,
    });
    if (result == null) return { settled: 0, paid: 0 }; // chưa đủ data (vd thiếu thông số)

    // Tỉ số chính xác: tỉ số thật không nằm trong các cửa đã mở → cửa "OTHER" thắng (nếu có).
    const selKeys = new Set(market.selections.map((s) => s.key));
    const winKey = !selKeys.has(result) && selKeys.has("OTHER") ? "OTHER" : result;

    const bets = await tx.bet.findMany({ where: { marketId, status: "PENDING" } });
    const totalPool = bets.reduce((s, b) => s + b.stake, 0);
    const winningPool = bets
      .filter((b) => b.selectionKey === winKey)
      .reduce((s, b) => s + b.stake, 0);

    let paid = 0;
    for (const b of bets) {
      const won = b.selectionKey === winKey;
      const payout = won
        ? market.mode === "FIXED"
          ? fixedPayout(b.stake, b.oddsAtBet ?? 2.0)
          : parimutuelPayout(b.stake, totalPool, winningPool)
        : 0;
      await tx.bet.update({ where: { id: b.id }, data: { status: won ? "WON" : "LOST", payout } });
      if (won && payout > 0) {
        await credit(tx, {
          userId: b.userId,
          type: "BET_WIN",
          amount: payout,
          refType: "market",
          refId: marketId,
          note: "Thắng kèo",
        });
        paid += payout;
      }
    }
    await tx.market.update({ where: { id: marketId }, data: { status: "SETTLED", result: winKey } });
    return { settled: bets.length, paid };
  });
}

export async function settleAllMarkets(): Promise<{ markets: number; settled: number }> {
  const open = await prisma.market.findMany({
    where: { status: { in: ["OPEN", "LOCKED"] }, match: { status: "FINISHED" } },
    select: { id: true },
  });
  let settled = 0;
  for (const m of open) settled += (await settleMarket(m.id)).settled;
  return { markets: open.length, settled };
}
