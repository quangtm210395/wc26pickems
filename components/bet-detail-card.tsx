import Link from "next/link";
import type { Bet, BetStatus, Market, MarketSelection, Match, Team } from "@prisma/client";
import { MARKET_TYPE_LABEL, selectionLabel, potentialReturn } from "@/lib/bet-display";
import { canCancelBet } from "@/lib/betting";
import { vnTime, vnDateLabel } from "@/lib/matches";
import { CancelBetButton } from "@/components/cancel-bet-button";

export type BetCardData = Bet & {
  market: Market & {
    selections: MarketSelection[];
    match: Match & { homeTeam: Team | null; awayTeam: Team | null };
  };
};

const vnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

function StatusBadge({
  status,
  payout,
  potential,
}: {
  status: BetStatus;
  payout: number | null;
  potential: number | null;
}) {
  const amt = (payout ?? 0).toLocaleString("vi-VN");
  if (status === "WON" || status === "HALF_WON") {
    return (
      <span className="shrink-0 rounded-md border border-accent/40 bg-accent/20 px-2 py-0.5 font-display text-[10px] font-semibold tabular-nums text-emerald-300">
        {status === "HALF_WON" && "½ "}+{amt}đ
      </span>
    );
  }
  if (status === "PUSH" || status === "VOID") {
    return (
      <span className="shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        Hòa vốn · hoàn {amt}đ
      </span>
    );
  }
  if (status === "HALF_LOST") {
    return (
      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        Thua nửa · hoàn {amt}đ
      </span>
    );
  }
  if (status === "LOST") {
    return (
      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        Thua
      </span>
    );
  }
  // PENDING
  return (
    <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
      Đang chờ
      {potential != null && <> · thắng {potential.toLocaleString("vi-VN")}đ</>}
    </span>
  );
}

/**
 * Thẻ 1 cược với đầy đủ chi tiết: loại kèo, lằn, tên cửa, tỉ lệ, tiền cược, trạng thái, giờ đặt.
 * `showMatch=false` khi đã có ngữ cảnh trận (trang chi tiết trận).
 */
export function BetDetailCard({
  bet,
  showMatch = true,
}: {
  bet: BetCardData;
  showMatch?: boolean;
}) {
  const market = bet.market;
  const match = market.match;
  const scored = match.status === "FINISHED" || match.status === "LIVE";
  const selLabel = selectionLabel(bet.selectionKey, market.selections);
  const potential = potentialReturn(bet.stake, bet.oddsAtBet);
  const canCancel = canCancelBet(bet.status, market.status, match.kickoff, new Date());

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">
      {showMatch && (
        <Link
          href={`/match/${match.id}`}
          className="flex items-center gap-1.5 text-sm font-medium hover:opacity-80"
        >
          <span>{match.homeTeam?.flag ?? "🏳️"}</span>
          <span className="truncate">{match.homeTeam?.name ?? "TBD"}</span>
          {scored ? (
            <span className="mx-1 font-display tabular-nums">
              {match.homeScore}-{match.awayScore}
            </span>
          ) : (
            <span className="mx-1 text-muted-foreground">vs</span>
          )}
          <span className="truncate">{match.awayTeam?.name ?? "TBD"}</span>
          <span>{match.awayTeam?.flag ?? "🏳️"}</span>
        </Link>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {MARKET_TYPE_LABEL[market.type]}
            {market.line != null && <span> · {market.line}</span>}
          </p>
          <p className="text-sm font-semibold leading-tight">{selLabel}</p>
        </div>
        <StatusBadge status={bet.status} payout={bet.payout} potential={potential} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {bet.oddsAtBet != null && (
          <span>
            Tỉ lệ{" "}
            <span className="font-display tabular-nums text-foreground">
              {bet.oddsAtBet.toFixed(2)}
            </span>
          </span>
        )}
        <span>
          Cược <span className="font-display tabular-nums text-foreground">{vnd(bet.stake)}</span>
        </span>
        <span>
          {vnDateLabel(bet.createdAt)} · {vnTime(bet.createdAt)}
        </span>
      </div>

      {canCancel && (
        <div className="flex justify-end border-t border-border/40 pt-2">
          <CancelBetButton betId={bet.id} />
        </div>
      )}
    </div>
  );
}
