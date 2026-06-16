import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import { startOfVnDay } from "@/lib/wallet";

export const CHECKIN_BASE = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export type CheckinReward = { base: number; bonus: number; total: number; growthPct: number };

/**
 * Phần thưởng cho ngày streak thứ n (PURE — test được).
 * - Gốc compound: ×1.1 mỗi ngày, ×1.2 nếu n chia hết cho 5.
 * - n chia hết cho 7 → thưởng thêm 50% gốc ngày đó (KHÔNG cộng vào gốc streak).
 */
export function checkinReward(streakDay: number): CheckinReward {
  const n = Math.max(1, Math.floor(streakDay));
  let base = CHECKIN_BASE;
  for (let d = 2; d <= n; d++) {
    base = Math.round(base * (d % 5 === 0 ? 1.2 : 1.1));
  }
  const growthPct = n <= 1 ? 0 : n % 5 === 0 ? 20 : 10;
  const bonus = n % 7 === 0 ? Math.round(base * 0.5) : 0;
  return { base, bonus, total: base + bonus, growthPct };
}

export type CheckinState = {
  streak: number; // chuỗi tới lần check-in gần nhất
  canCheckIn: boolean; // hôm nay chưa check-in
  nextStreakDay: number; // check-in tiếp theo là ngày thứ mấy
  nextReward: CheckinReward;
};

export async function getCheckinState(userId: string, now = new Date()): Promise<CheckinState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { checkinStreak: true, lastCheckinAt: true },
  });
  const streak = user?.checkinStreak ?? 0;
  const todayVn = startOfVnDay(now).getTime();
  const lastVn = user?.lastCheckinAt ? startOfVnDay(user.lastCheckinAt).getTime() : null;
  const checkedToday = lastVn === todayVn;
  const continues = lastVn === todayVn - DAY_MS;
  const nextStreakDay = checkedToday || continues ? streak + 1 : 1;
  return {
    streak,
    canCheckIn: !checkedToday,
    nextStreakDay,
    nextReward: checkinReward(nextStreakDay),
  };
}

export async function checkIn(
  userId: string,
  now = new Date(),
): Promise<{
  ok: boolean;
  reason?: string;
  streakDay?: number;
  base?: number;
  bonus?: number;
  total?: number;
  balance?: number;
}> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { checkinStreak: true, lastCheckinAt: true },
    });
    if (!user) return { ok: false, reason: "User không tồn tại" };
    const todayVn = startOfVnDay(now).getTime();
    const lastVn = user.lastCheckinAt ? startOfVnDay(user.lastCheckinAt).getTime() : null;
    if (lastVn === todayVn) return { ok: false, reason: "Đã check-in hôm nay rồi" };
    const newStreak = lastVn === todayVn - DAY_MS ? user.checkinStreak + 1 : 1;
    const r = checkinReward(newStreak);
    const note =
      r.bonus > 0 ? `Check-in ngày ${newStreak} 🔥 +thưởng mốc 7 ngày` : `Check-in ngày ${newStreak} 🔥`;
    const balance = await credit(tx, {
      userId,
      type: "DRIP",
      amount: r.total,
      refType: "checkin",
      note,
    });
    await tx.user.update({
      where: { id: userId },
      data: { checkinStreak: newStreak, lastCheckinAt: now },
    });
    return { ok: true, streakDay: newStreak, base: r.base, bonus: r.bonus, total: r.total, balance };
  });
}
