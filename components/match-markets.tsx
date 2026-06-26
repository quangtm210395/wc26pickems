import { MARKET_TYPE_LABEL } from "@/lib/bet-display";
import { BetButtons } from "@/components/bet-buttons";
import type { Market, MarketSelection } from "@prisma/client";

type MarketWithSelections = Market & { selections: MarketSelection[] };

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
            selections={market.selections.map((s) => ({ key: s.key, label: s.label, odds: s.odds }))}
          />
        </div>
      ))}
    </div>
  );
}
