"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { settleMatch } from "@/lib/scoring";
import { settleAllMarkets } from "@/lib/betting";
import { credit } from "@/lib/economy";
import type { MatchStatus } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Chỉ admin mới được thao tác");
  return session;
}

export type MatchResultInput = {
  matchId: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  homePens?: number | null;
  awayPens?: number | null;
  stats?: {
    homeCorners?: number | null;
    awayCorners?: number | null;
    homeYellow?: number | null;
    awayYellow?: number | null;
    homeRed?: number | null;
    awayRed?: number | null;
    homeShots?: number | null;
    awayShots?: number | null;
    homePoss?: number | null;
    awayPoss?: number | null;
  };
};

/**
 * Admin nhập kết quả + thông số 1 trận. Nếu FINISHED → tự settle pickems + kèo
 * (idempotent: chạy lại không cộng/trừ điểm 2 lần).
 */
export async function saveMatchResult(input: MatchResultInput) {
  await requireAdmin();
  await prisma.match.update({
    where: { id: input.matchId },
    data: {
      status: input.status,
      homeScore: input.homeScore ?? null,
      awayScore: input.awayScore ?? null,
      homePens: input.homePens ?? null,
      awayPens: input.awayPens ?? null,
    },
  });
  if (input.stats) {
    await prisma.matchStats.upsert({
      where: { matchId: input.matchId },
      create: { matchId: input.matchId, ...input.stats },
      update: { ...input.stats },
    });
  }
  let settled: { pickems: number; bets: number } | null = null;
  if (input.status === "FINISHED") {
    const p = await settleMatch(input.matchId);
    const m = await settleAllMarkets();
    settled = { pickems: p.settled, bets: m.settled };
  }
  revalidatePath("/admin");
  revalidatePath("/lich");
  revalidatePath("/bxh");
  revalidatePath(`/match/${input.matchId}`);
  return { ok: true, settled };
}

/** Admin chỉnh điểm user (ghi ledger ADJUST). */
export async function adjustBalance(userId: string, amount: number, note: string) {
  await requireAdmin();
  if (!Number.isInteger(amount) || amount === 0) throw new Error("Số điểm không hợp lệ");
  await credit(prisma, { userId, type: "ADJUST", amount, note: note || "Admin điều chỉnh" });
  revalidatePath("/admin");
  revalidatePath("/bxh");
  return { ok: true };
}
