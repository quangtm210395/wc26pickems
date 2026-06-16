import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import type { Match, PickChoice, Stage } from "@prisma/client";

/** Thang điểm pickems theo vòng (đoán đúng đội thắng/hòa). */
export const STAGE_POINTS: Record<Stage, number> = {
  GROUP: 100,
  R32: 100,
  R16: 150,
  QF: 250,
  SF: 400,
  THIRD: 200,
  FINAL: 500,
};

type OutcomeInput = Pick<Match, "homeScore" | "awayScore" | "homePens" | "awayPens" | "stage">;

/** Kết quả thực tế của trận. Knock-out hòa 90' thì xét luân lưu. Chưa có tỉ số → null. */
export function matchOutcome(m: OutcomeInput): PickChoice | null {
  if (m.homeScore == null || m.awayScore == null) return null;
  if (m.homeScore > m.awayScore) return "HOME";
  if (m.homeScore < m.awayScore) return "AWAY";
  // hòa sau 90'
  if (m.stage === "GROUP") return "DRAW";
  if (m.homePens != null && m.awayPens != null) {
    return m.homePens >= m.awayPens ? "HOME" : "AWAY";
  }
  return "DRAW"; // knock-out hòa nhưng chưa có pen → chưa phân định
}

/** Chấm 1 pick so với kết quả trận. Ném lỗi nếu trận chưa có kết quả. */
export function scorePick(
  choice: PickChoice,
  m: OutcomeInput,
): { status: "WON" | "LOST"; points: number } {
  const outcome = matchOutcome(m);
  if (outcome == null) throw new Error("Trận chưa có kết quả");
  const won = choice === outcome;
  return { status: won ? "WON" : "LOST", points: won ? STAGE_POINTS[m.stage] : 0 };
}

/**
 * Settle toàn bộ pick PENDING của 1 trận đã FINISHED. Idempotent:
 * chỉ đụng pick PENDING, chạy lại không cộng điểm 2 lần.
 */
export async function settleMatch(matchId: string): Promise<{ settled: number; awarded: number }> {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "FINISHED" || matchOutcome(match) == null) {
      return { settled: 0, awarded: 0 };
    }
    const picks = await tx.pick.findMany({ where: { matchId, status: "PENDING" } });
    let awarded = 0;
    for (const p of picks) {
      const { status, points } = scorePick(p.choice, match);
      await tx.pick.update({ where: { id: p.id }, data: { status, points } });
      if (points > 0) {
        await credit(tx, {
          userId: p.userId,
          type: "PICKEM_WIN",
          amount: points,
          refType: "match",
          refId: matchId,
          note: `Pickem đúng (${match.stage})`,
        });
        awarded += points;
      }
    }
    return { settled: picks.length, awarded };
  });
}

/** Settle mọi trận đã kết thúc (dùng cho cron/admin). */
export async function settleAllFinished(): Promise<{ matches: number; settled: number }> {
  const finished = await prisma.match.findMany({
    where: { status: "FINISHED" },
    select: { id: true },
  });
  let settled = 0;
  for (const f of finished) {
    settled += (await settleMatch(f.id)).settled;
  }
  return { matches: finished.length, settled };
}
