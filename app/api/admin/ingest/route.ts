import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { settleMatch } from "@/lib/scoring";
import { settleAllMarkets } from "@/lib/betting";
import type { MatchStatus, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STATUSES: MatchStatus[] = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED"];

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
    select: { id: true, status: true },
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

  const finalStatus = (body.status as MatchStatus) ?? match.status;
  let settled: { pickems: number; bets: number } | null = null;
  if (finalStatus === "FINISHED") {
    const p = await settleMatch(match.id);
    const m = await settleAllMarkets();
    settled = { pickems: p.settled, bets: m.settled };
  }

  revalidatePath("/lich");
  revalidatePath("/bxh");
  revalidatePath(`/match/${match.id}`);
  revalidatePath("/admin");

  return NextResponse.json({ ok: true, externalId: extId, status: finalStatus, settled });
}
