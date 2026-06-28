import { MARKET_TYPE_LABEL } from "@/lib/bet-display";
import { BetButtons } from "@/components/bet-buttons";
import type { Market, MarketSelection } from "@prisma/client";

type MarketWithSelections = Market & { selections: MarketSelection[] };

/**
 * Thứ tự hiển thị cố định cho từng loại kèo, để cửa đội NHÀ luôn nằm bên trái —
 * khớp với header (nhà trái / khách phải). Cần thiết vì id selection là cuid (không
 * tuần tự) nên thứ tự Prisma trả về không ổn định → có trận hiện ngược. KHÔNG ảnh
 * hưởng settle (settle dùng selectionKey, không dùng thứ tự hiển thị).
 */
const SELECTION_ORDER: Record<string, string[]> = {
  MATCH_1X2: ["HOME", "DRAW", "AWAY"],
  GOALS_OU: ["OVER", "UNDER"],
  CORNERS_OU: ["OVER", "UNDER"],
  CARDS_OU: ["OVER", "UNDER"],
  ASIAN_HANDICAP: ["HOME", "AWAY"],
  // CORRECT_SCORE: giữ nguyên (nhiều cửa, không có quy ước nhà/khách)
};

function orderedSelections(market: MarketWithSelections) {
  const order = SELECTION_ORDER[market.type];
  if (!order) return market.selections;
  const rank = (k: string) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  return [...market.selections].sort((a, b) => rank(a.key) - rank(b.key));
}

/** Danh sách kèo (markets) của 1 trận + nút đặt cược. Dùng chung trang Kèo và trang chi tiết trận. */
export function MatchMarkets({ markets }: { markets: MarketWithSelections[] }) {
  if (markets.length === 0) return null;
  return (
    <div className="space-y-2">
      {markets.map((market) => (
        <div key={market.id}>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {MARKET_TYPE_LABEL[market.type]}
            {market.line != null && <span className="ml-1 text-muted-foreground">({market.line})</span>}
          </p>
          <BetButtons
            marketId={market.id}
            selections={orderedSelections(market).map((s) => ({ key: s.key, label: s.label, odds: s.odds }))}
          />
        </div>
      ))}
    </div>
  );
}
