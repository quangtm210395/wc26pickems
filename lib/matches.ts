import { prisma } from "@/lib/prisma";
import type { Match, Team, MatchStats, Stage } from "@prisma/client";

export type MatchWithTeams = Match & { homeTeam: Team | null; awayTeam: Team | null };
export type MatchDetail = MatchWithTeams & { stats: MatchStats | null };

const VN_TZ = "Asia/Ho_Chi_Minh";

export function vnTime(d: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: VN_TZ,
  }).format(d);
}

/** Khóa ngày YYYY-MM-DD theo giờ VN, dùng để nhóm. */
export function vnDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: VN_TZ,
  }).format(d);
}

export function vnDateLabel(d: Date): string {
  const s = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: VN_TZ,
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Data access ----------

export async function getAllMatches(): Promise<MatchWithTeams[]> {
  return prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });
}

export async function getMatchById(id: string): Promise<MatchDetail | null> {
  return prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true, stats: true },
  });
}

// ---------- Pure grouping helpers (test được, không cần DB) ----------

export type DayGroup = { key: string; label: string; matches: MatchWithTeams[] };

export function groupByDay(matches: MatchWithTeams[]): DayGroup[] {
  const map = new Map<string, MatchWithTeams[]>();
  for (const m of matches) {
    const k = vnDateKey(m.kickoff);
    let arr = map.get(k);
    if (!arr) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(m);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ms]) => ({ key, label: vnDateLabel(ms[0].kickoff), matches: ms }));
}

export type GroupBucket = { name: string; matches: MatchWithTeams[] };

export function groupByGroup(matches: MatchWithTeams[]): GroupBucket[] {
  const map = new Map<string, MatchWithTeams[]>();
  for (const m of matches) {
    const k = m.groupName ?? "?";
    let arr = map.get(k);
    if (!arr) {
      arr = [];
      map.set(k, arr);
    }
    arr.push(m);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ms]) => ({ name, matches: ms }));
}

/**
 * Trận "tâm điểm" để ghim đầu trang Lịch: đang LIVE + sắp đá (trong cửa sổ giờ) + vừa kết thúc.
 * Thứ tự: live → sắp đá (gần giờ nhất trước) → vừa xong (mới nhất trước). Generic để giữ nguyên kiểu trận.
 */
export function selectPinnedMatches<T extends { status: string; kickoff: Date }>(
  matches: T[],
  now: Date,
  opts: { windowHours?: number; upcomingLimit?: number; finishedLimit?: number } = {},
): T[] {
  const { windowHours = 24, upcomingLimit = 4, finishedLimit = 4 } = opts;
  const span = windowHours * 3600 * 1000;
  const t = (m: T) => m.kickoff.getTime();
  const nowMs = now.getTime();

  const live = matches.filter((m) => m.status === "LIVE").sort((a, b) => t(a) - t(b));
  const upcoming = matches
    .filter((m) => m.status === "SCHEDULED" && t(m) > nowMs && t(m) <= nowMs + span)
    .sort((a, b) => t(a) - t(b))
    .slice(0, upcomingLimit);
  const finished = matches
    .filter((m) => m.status === "FINISHED" && t(m) <= nowMs && t(m) >= nowMs - span)
    .sort((a, b) => t(b) - t(a))
    .slice(0, finishedLimit);

  return [...live, ...upcoming, ...finished];
}

// ---------- Knockout helpers ----------

export async function getKnockoutMatches(): Promise<MatchWithTeams[]> {
  return prisma.match.findMany({
    where: { stage: { not: "GROUP" } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });
}

const STAGE_ORDER: Stage[] = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];

const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Vòng bảng",
  R32: "Vòng 1/16",
  R16: "Vòng 1/8",
  QF: "Tứ kết",
  SF: "Bán kết",
  THIRD: "Tranh hạng 3",
  FINAL: "Chung kết",
};

export type StageBucket = { stage: Stage; label: string; matches: MatchWithTeams[] };

export function groupByStage(matches: MatchWithTeams[]): StageBucket[] {
  const map = new Map<Stage, MatchWithTeams[]>();
  for (const m of matches) {
    const s = m.stage as Stage;
    let arr = map.get(s);
    if (!arr) {
      arr = [];
      map.set(s, arr);
    }
    arr.push(m);
  }
  return STAGE_ORDER.filter((s) => map.has(s)).map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    matches: map.get(s)!,
  }));
}
