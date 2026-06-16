import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";

export const POOL_MIN_STAKE = 50;

export type PoolBet = { userId: string; teamId: string; stake: number };
export type Payout = { userId: string; payout: number; won: boolean };

/**
 * Chia pool parimutuel cho người đoán đúng nhà vô địch (PURE — test được).
 * - totalPool = tổng mọi stake.
 * - winner (đặt đúng championTeamId) nhận = totalPool * stake / tổng-stake-người-thắng.
 * - Không ai đúng → hoàn tiền (payout = stake, won = false).
 * - Làm tròn xuống; phần lẻ dồn cho winner stake lớn nhất để BẢO TOÀN tổng pool.
 */
export function computeChampionPayouts(bets: PoolBet[], championTeamId: string): Payout[] {
  const totalPool = bets.reduce((s, b) => s + b.stake, 0);
  const winnerTotal = bets
    .filter((b) => b.teamId === championTeamId)
    .reduce((s, b) => s + b.stake, 0);

  if (winnerTotal === 0) {
    return bets.map((b) => ({ userId: b.userId, payout: b.stake, won: false }));
  }

  const result: Payout[] = bets.map((b) =>
    b.teamId === championTeamId
      ? { userId: b.userId, payout: Math.floor((totalPool * b.stake) / winnerTotal), won: true }
      : { userId: b.userId, payout: 0, won: false },
  );

  const remainder = totalPool - result.reduce((s, r) => s + r.payout, 0);
  if (remainder > 0) {
    let topIdx = -1;
    let topStake = -1;
    for (let i = 0; i < bets.length; i++) {
      if (bets[i].teamId === championTeamId && bets[i].stake > topStake) {
        topStake = bets[i].stake;
        topIdx = i;
      }
    }
    if (topIdx >= 0) result[topIdx].payout += remainder;
  }
  return result;
}

// ---------- DB ----------

/** Hạn đặt = giờ trận knock-out sớm nhất (đóng pool khi vòng loại trực tiếp bắt đầu). */
export async function getPoolDeadline(): Promise<Date | null> {
  const ko = await prisma.match.findFirst({
    where: { stage: { not: "GROUP" } },
    orderBy: { kickoff: "asc" },
    select: { kickoff: true },
  });
  return ko?.kickoff ?? null;
}

export async function getPoolStatus(): Promise<{
  deadline: Date | null;
  open: boolean;
  settled: boolean;
}> {
  const [deadline, total, pending] = await Promise.all([
    getPoolDeadline(),
    prisma.championBet.count(),
    prisma.championBet.count({ where: { status: "PENDING" } }),
  ]);
  const settled = total > 0 && pending === 0;
  const open = !settled && (deadline == null || new Date() < deadline);
  return { deadline, open, settled };
}

export async function placeChampionBet(
  userId: string,
  teamId: string,
  stake: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (!Number.isInteger(stake) || stake < POOL_MIN_STAKE) {
    return { ok: false, reason: `Đặt tối thiểu ${POOL_MIN_STAKE}đ` };
  }
  const status = await getPoolStatus();
  if (!status.open) {
    return { ok: false, reason: "Pool đã đóng (vòng knock-out đã bắt đầu)" };
  }
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
  if (!team) return { ok: false, reason: "Đội không hợp lệ" };

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < stake) return { ok: false, reason: "Số dư không đủ" };
    const existing = await tx.championBet.findUnique({ where: { userId } });
    if (existing && existing.teamId !== teamId) {
      return { ok: false, reason: "Bạn đã đặt cửa đội khác rồi, không đổi được" };
    }
    await credit(tx, {
      userId,
      type: "BET_STAKE",
      amount: -stake,
      refType: "champion",
      refId: teamId,
      note: `Pool vô địch · ${team.name}`,
    });
    if (existing) {
      await tx.championBet.update({ where: { userId }, data: { stake: existing.stake + stake } });
    } else {
      await tx.championBet.create({ data: { userId, teamId, stake } });
    }
    return { ok: true };
  });
}

export type PoolTeamStat = {
  teamId: string;
  name: string;
  flag: string | null;
  total: number;
  count: number;
};

export async function getPoolStats(userId?: string) {
  const bets = await prisma.championBet.findMany({ include: { team: true } });
  const totalPool = bets.reduce((s, b) => s + b.stake, 0);
  const byTeam = new Map<string, PoolTeamStat>();
  for (const b of bets) {
    let t = byTeam.get(b.teamId);
    if (!t) {
      t = { teamId: b.teamId, name: b.team.name, flag: b.team.flag, total: 0, count: 0 };
      byTeam.set(b.teamId, t);
    }
    t.total += b.stake;
    t.count += 1;
  }
  const teams = [...byTeam.values()].sort((a, b) => b.total - a.total);
  const mine = userId ? bets.find((b) => b.userId === userId) : undefined;
  return {
    totalPool,
    totalBettors: bets.length,
    teams,
    myBet: mine
      ? {
          teamId: mine.teamId,
          teamName: mine.team.name,
          teamFlag: mine.team.flag,
          stake: mine.stake,
          status: mine.status,
          payout: mine.payout,
        }
      : null,
  };
}

/** Chốt pool khi biết nhà vô địch. Idempotent (chỉ xử lý bet PENDING). */
export async function settleChampionPool(
  championTeamId: string,
): Promise<{ settled: number; refunded: boolean }> {
  const pending = await prisma.championBet.findMany({
    where: { status: "PENDING" },
    select: { id: true, userId: true, teamId: true, stake: true },
  });
  if (pending.length === 0) return { settled: 0, refunded: false };

  const payouts = computeChampionPayouts(
    pending.map((b) => ({ userId: b.userId, teamId: b.teamId, stake: b.stake })),
    championTeamId,
  );
  const refunded = !pending.some((b) => b.teamId === championTeamId);
  const byUser = new Map(payouts.map((p) => [p.userId, p]));

  await prisma.$transaction(async (tx) => {
    for (const b of pending) {
      const p = byUser.get(b.userId)!;
      if (refunded) {
        await credit(tx, {
          userId: b.userId,
          type: "ADJUST",
          amount: p.payout,
          refType: "champion",
          refId: b.id,
          note: "Hoàn pool vô địch (không ai đoán đúng)",
        });
        await tx.championBet.update({ where: { id: b.id }, data: { status: "VOID", payout: p.payout } });
      } else if (p.won) {
        await credit(tx, {
          userId: b.userId,
          type: "BET_WIN",
          amount: p.payout,
          refType: "champion",
          refId: b.id,
          note: "Thắng pool dự đoán vô địch 🏆",
        });
        await tx.championBet.update({ where: { id: b.id }, data: { status: "WON", payout: p.payout } });
      } else {
        await tx.championBet.update({ where: { id: b.id }, data: { status: "LOST", payout: 0 } });
      }
    }
  });
  return { settled: pending.length, refunded };
}
