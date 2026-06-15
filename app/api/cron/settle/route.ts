import { NextResponse } from "next/server";
import { settleAllFinished } from "@/lib/scoring";
import { settleAllMarkets } from "@/lib/betting";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Settle pickems + kèo cho các trận đã kết thúc. Idempotent — chạy lại an toàn.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const picks = await settleAllFinished();
  const markets = await settleAllMarkets();
  return NextResponse.json({ ok: true, picks, markets });
}
