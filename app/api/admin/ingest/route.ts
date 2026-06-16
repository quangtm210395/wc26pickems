import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { settleMatch } from "@/lib/scoring";
import { settleAllMarkets } from "@/lib/betting";
import { settleChampionPool } from "@/lib/champion";
import type {
  MatchStatus,
  MarketType,
  MarketMode,
  MarketStatus,
  Prisma,
} from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED"];
const MARKET_TYPES: MarketType[] = [
  "MATCH_1X2",
  "GOALS_OU",
  "CORNERS_OU",
  "CARDS_OU",
  "CORRECT_SCORE",
];
const MARKET_MODES: MarketMode[] = ["FIXED", "PARIMUTUEL"];
const MARKET_STATUSES: MarketStatus[] = ["OPEN", "LOCKED", "SETTLED", "VOID"];

type StatsInput = Partial<{
  homeCorners: number;
  awayCorners: number;
  homeYellow: number;
  awayYellow: number;
  homeRed: number;
  awayRed: number;
  homeShots: number;
  awayShots: number;
  homePoss: number;
  awayPoss: number;
}>;

type SelectionInput = { key: string; label?: string; odds?: number };
type MarketInput = {
  type?: string;
  mode?: string;
  line?: number | null;
  status?: string;
  selections?: SelectionInput[];
};

type Body = {
  matchExternalId?: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePens?: number | null;
  awayPens?: number | null;
  homeLineup?: string | null;
  awayLineup?: string | null;
  stats?: StatsInput;
  markets?: MarketInput[];
};

/**
 * Nhập dữ liệu trận (tỉ số / thông số / đội hình) — do admin/Claude cào về rồi đẩy vào.
 * Bảo vệ bằng CRON_SECRET. Cập nhật một phần (chỉ field nào gửi lên). Nếu kết quả là
 * FINISHED → tự settle pickems + kèo (idempotent).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const extId = (body.matchExternalId ?? "").trim();
  if (!extId) return NextResponse.json({ error: "thiếu matchExternalId" }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { externalId: extId },
    select: { id: true, status: true, stage: true },
  });
  if (!match) return NextResponse.json({ error: `không tìm thấy trận ${extId}` }, { status: 404 });

  if (body.status && !STATUSES.includes(body.status as MatchStatus)) {
    return NextResponse.json({ error: `status không hợp lệ: ${body.status}` }, { status: 400 });
  }

  const data: Prisma.MatchUpdateInput = {};
  if (body.status) data.status = body.status as MatchStatus;
  if (body.homeScore !== undefined) data.homeScore = body.homeScore;
  if (body.awayScore !== undefined) data.awayScore = body.awayScore;
  if (body.homePens !== undefined) data.homePens = body.homePens;
  if (body.awayPens !== undefined) data.awayPens = body.awayPens;
  if (body.homeLineup !== undefined) data.homeLineup = body.homeLineup;
  if (body.awayLineup !== undefined) data.awayLineup = body.awayLineup;

  await prisma.match.update({ where: { id: match.id }, data });

  if (body.stats && Object.keys(body.stats).length > 0) {
    await prisma.matchStats.upsert({
      where: { matchId: match.id },
      create: { matchId: match.id, ...body.stats },
      update: { ...body.stats },
    });
  }

  // Kèo: tạo/cập nhật market + tỉ lệ (selections). Market định danh theo (match, type, line).
  let marketsUpserted = 0;
  if (Array.isArray(body.markets)) {
    for (const mk of body.markets) {
      if (!mk.type || !MARKET_TYPES.includes(mk.type as MarketType)) {
        return NextResponse.json({ error: `market type không hợp lệ: ${mk.type}` }, { status: 400 });
      }
      if (mk.mode && !MARKET_MODES.includes(mk.mode as MarketMode)) {
        return NextResponse.json({ error: `market mode không hợp lệ: ${mk.mode}` }, { status: 400 });
      }
      if (mk.status && !MARKET_STATUSES.includes(mk.status as MarketStatus)) {
        return NextResponse.json(
          { error: `market status không hợp lệ: ${mk.status}` },
          { status: 400 },
        );
      }
      const line = mk.line ?? null;
      const existing = await prisma.market.findFirst({
        where: { matchId: match.id, type: mk.type as MarketType, line },
        select: { id: true },
      });
      let marketId: string;
      if (existing) {
        await prisma.market.update({
          where: { id: existing.id },
          data: {
            ...(mk.mode ? { mode: mk.mode as MarketMode } : {}),
            ...(mk.status ? { status: mk.status as MarketStatus } : {}),
          },
        });
        marketId = existing.id;
      } else {
        const created = await prisma.market.create({
          data: {
            matchId: match.id,
            type: mk.type as MarketType,
            line,
            mode: (mk.mode as MarketMode) ?? "FIXED",
            ...(mk.status ? { status: mk.status as MarketStatus } : {}),
          },
          select: { id: true },
        });
        marketId = created.id;
      }
      for (const sel of mk.selections ?? []) {
        if (!sel.key) continue;
        await prisma.marketSelection.upsert({
          where: { marketId_key: { marketId, key: sel.key } },
          create: { marketId, key: sel.key, label: sel.label ?? sel.key, odds: sel.odds ?? 2.0 },
          update: { label: sel.label ?? sel.key, odds: sel.odds ?? 2.0 },
        });
      }
      marketsUpserted++;
    }
  }

  const finalStatus = (body.status as MatchStatus) ?? match.status;
  let settled: { pickems: number; bets: number } | null = null;
  let championPool: { settled: number; refunded: boolean } | null = null;
  if (finalStatus === "FINISHED") {
    const p = await settleMatch(match.id);
    const m = await settleAllMarkets();
    settled = { pickems: p.settled, bets: m.settled };

    // Trận chung kết kết thúc → chốt pool dự đoán vô địch.
    if (match.stage === "FINAL") {
      const f = await prisma.match.findUnique({
        where: { id: match.id },
        select: {
          homeScore: true,
          awayScore: true,
          homePens: true,
          awayPens: true,
          homeTeamId: true,
          awayTeamId: true,
        },
      });
      if (f && f.homeScore != null && f.awayScore != null && f.homeTeamId && f.awayTeamId) {
        let winner: string | null = null;
        if (f.homeScore > f.awayScore) winner = f.homeTeamId;
        else if (f.awayScore > f.homeScore) winner = f.awayTeamId;
        else if (f.homePens != null && f.awayPens != null)
          winner = f.homePens >= f.awayPens ? f.homeTeamId : f.awayTeamId;
        if (winner) championPool = await settleChampionPool(winner);
      }
    }
  }

  revalidatePath("/lich");
  revalidatePath("/bxh");
  revalidatePath(`/match/${match.id}`);
  revalidatePath("/admin");

  return NextResponse.json({
    ok: true,
    externalId: extId,
    status: finalStatus,
    settled,
    championPool,
    marketsUpserted,
  });
}
