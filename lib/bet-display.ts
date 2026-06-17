import type { MarketType } from "@prisma/client";

/** Nhãn tiếng Việt cho từng loại kèo — dùng chung ở trang Kèo và chi tiết trận. */
export const MARKET_TYPE_LABEL: Record<MarketType, string> = {
  MATCH_1X2: "1x2",
  GOALS_OU: "Tài/Xỉu bàn thắng",
  CORNERS_OU: "Phạt góc",
  CARDS_OU: "Thẻ",
  CORRECT_SCORE: "Tỉ số chính xác",
  ASIAN_HANDICAP: "Kèo chấp (châu Á)",
};

/** Tên cửa đã đặt (vd "Brazil -0.5") — fallback về key thô nếu không khớp selection nào. */
export function selectionLabel(
  selectionKey: string,
  selections: { key: string; label: string }[],
): string {
  return selections.find((s) => s.key === selectionKey)?.label ?? selectionKey;
}

/** Tiền thắng tối đa của 1 cược FIXED đang chờ; null nếu không có odds (parimutuel). */
export function potentialReturn(stake: number, oddsAtBet: number | null): number | null {
  return oddsAtBet != null ? Math.round(stake * oddsAtBet) : null;
}
