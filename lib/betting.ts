import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import type { MarketType, BetStatus, MarketStatus } from "@prisma/client";

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
    case "ASIAN_HANDICAP":
      // Kèo chấp settle theo TỪNG cược (win/half/push/loss) trong settleMarket, không dùng winKey.
      return null;
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

// ---------- Kèo chấp châu Á (Asian Handicap) ----------

export type AhOutcome = "WIN" | "HALF_WIN" | "PUSH" | "HALF_LOSS" | "LOSS";

/**
 * Kết quả 1 cược kèo chấp châu Á.
 * @param side          phía cược: "HOME" | "AWAY"
 * @param homeHandicap  chấp của ĐỘI NHÀ (âm = nhà cửa trên, vd -0.5). Khách = -homeHandicap.
 *
 * margin = (hiệu bàn thắng theo phía cược) + (chấp theo phía cược).
 * Vì hiệu là số nguyên và chấp ∈ {…, .25, .5, .75, nguyên}, margin luôn là bội số của 0.25,
 * nên chỉ cần phân nhánh quanh 0: ≥0.5 thắng, .25 thắng nửa, 0 hòa vốn, -.25 thua nửa, ≤-0.5 thua.
 */
export function asianHandicapOutcome(
  side: "HOME" | "AWAY",
  homeHandicap: number,
  homeScore: number,
  awayScore: number,
): AhOutcome {
  const goalDiff = side === "HOME" ? homeScore - awayScore : awayScore - homeScore;
  const handicap = side === "HOME" ? homeHandicap : -homeHandicap;
  // Làm tròn về bội số 0.25 để loại sai số dấu phẩy động.
  const margin = Math.round((goalDiff + handicap) * 4) / 4;
  if (margin >= 0.5) return "WIN";
  if (margin === 0.25) return "HALF_WIN";
  if (margin === 0) return "PUSH";
  if (margin === -0.25) return "HALF_LOSS";
  return "LOSS"; // margin <= -0.5
}

/** Số điểm HOÀN VỀ ví (gồm cả phần cược gốc) theo kết quả kèo chấp. */
export function asianHandicapReturn(stake: number, odds: number, outcome: AhOutcome): number {
  switch (outcome) {
    case "WIN":
      return Math.round(stake * odds);
    case "HALF_WIN":
      // Nửa cược ăn theo odds, nửa cược hoàn lại.
      return Math.round((stake / 2) * odds) + Math.round(stake / 2);
    case "PUSH":
      return stake;
    case "HALF_LOSS":
      return Math.round(stake / 2);
    case "LOSS":
      return 0;
  }
}

/** Map kết quả kèo chấp → BetStatus lưu DB. */
export function ahOutcomeToStatus(outcome: AhOutcome): BetStatus {
  switch (outcome) {
    case "WIN":
      return "WON";
    case "HALF_WIN":
      return "HALF_WON";
    case "PUSH":
      return "PUSH";
    case "HALF_LOSS":
      return "HALF_LOST";
    case "LOSS":
      return "LOST";
  }
}

function ahSettleNote(outcome: AhOutcome): string {
  switch (outcome) {
    case "WIN":
      return "Thắng kèo chấp";
    case "HALF_WIN":
      return "Thắng nửa kèo chấp";
    case "PUSH":
      return "Hòa vốn kèo chấp (hoàn cược)";
    case "HALF_LOSS":
      return "Thua nửa kèo chấp (hoàn nửa)";
    case "LOSS":
      return "Thua kèo chấp";
  }
}

/** Kèo còn hủy được không: chưa settle, market còn mở, và trận chưa tới giờ đá. */
export function canCancelBet(
  betStatus: BetStatus,
  marketStatus: MarketStatus,
  matchKickoff: Date,
  now: Date,
): boolean {
  return betStatus === "PENDING" && marketStatus === "OPEN" && matchKickoff > now;
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

/** Hủy 1 kèo đang chờ (chưa khóa) của user → hoàn cược + đánh dấu VOID. Idempotent qua check PENDING. */
export async function cancelBet(userId: string, betId: string) {
  return prisma.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({
      where: { id: betId },
      include: { market: { include: { match: true } } },
    });
    if (!bet || bet.userId !== userId) throw new Error("Không tìm thấy kèo");
    if (!canCancelBet(bet.status, bet.market.status, bet.market.match.kickoff, new Date())) {
      throw new Error("Kèo đã khóa hoặc đã xử lý, không hủy được");
    }
    await credit(tx, {
      userId,
      type: "BET_REFUND",
      amount: bet.stake,
      refType: "market",
      refId: bet.marketId,
      note: "Hủy kèo — hoàn cược",
    });
    return tx.bet.update({ where: { id: bet.id }, data: { status: "VOID", payout: bet.stake } });
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
    if (match.homeScore == null || match.awayScore == null) return { settled: 0, paid: 0 };

    // ----- Kèo chấp châu Á: settle theo TỪNG cược (win/half/push/loss + hoàn tiền) -----
    if (market.type === "ASIAN_HANDICAP") {
      if (market.line == null) return { settled: 0, paid: 0 };
      const bets = await tx.bet.findMany({ where: { marketId, status: "PENDING" } });
      let paid = 0;
      for (const b of bets) {
        const side = b.selectionKey === "AWAY" ? "AWAY" : "HOME";
        const outcome = asianHandicapOutcome(side, market.line, match.homeScore, match.awayScore);
        const ret = asianHandicapReturn(b.stake, b.oddsAtBet ?? 2.0, outcome);
        await tx.bet.update({
          where: { id: b.id },
          data: { status: ahOutcomeToStatus(outcome), payout: ret },
        });
        if (ret > 0) {
          // Cộng cả phần thắng lẫn phần hoàn (push/half) qua BET_WIN — note phân biệt loại.
          await credit(tx, {
            userId: b.userId,
            type: "BET_WIN",
            amount: ret,
            refType: "market",
            refId: marketId,
            note: ahSettleNote(outcome),
          });
          paid += ret;
        }
      }
      await tx.market.update({
        where: { id: marketId },
        data: { status: "SETTLED", result: `${match.homeScore}-${match.awayScore}` },
      });
      return { settled: bets.length, paid };
    }

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
