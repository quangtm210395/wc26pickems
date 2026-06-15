import { prisma } from "@/lib/prisma";
import type { Match, Team, MatchStats } from "@prisma/client";

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
