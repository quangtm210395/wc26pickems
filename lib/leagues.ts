import { prisma } from "@/lib/prisma";

// Mã nhóm: bỏ ký tự dễ nhầm (0/O, 1/I).
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LEN = 6;

function genCode(): string {
  let s = "";
  for (let i = 0; i < CODE_LEN; i++) {
    s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return s;
}

export async function createLeague(userId: string, name: string) {
  const clean = name.trim().slice(0, 40) || "Nhóm đua";
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.league.findUnique({ where: { code }, select: { id: true } });
    if (!exists) break;
    code = genCode();
  }
  return prisma.league.create({
    data: {
      name: clean,
      code,
      ownerId: userId,
      members: { create: { userId } }, // chủ nhóm tự vào luôn
    },
  });
}

export async function joinLeague(
  userId: string,
  code: string,
): Promise<{ ok: boolean; code?: string; reason?: string }> {
  const c = code.trim().toUpperCase();
  if (!c) return { ok: false, reason: "Thiếu mã nhóm" };
  const league = await prisma.league.findUnique({
    where: { code: c },
    select: { id: true, code: true },
  });
  if (!league) return { ok: false, reason: "Mã nhóm không tồn tại" };
  await prisma.leagueMember.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId } },
    create: { leagueId: league.id, userId },
    update: {},
  });
  return { ok: true, code: league.code };
}

export async function leaveLeague(
  userId: string,
  leagueId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });
  if (!league) return { ok: false, reason: "Nhóm không tồn tại" };
  if (league.ownerId === userId) return { ok: false, reason: "Chủ nhóm không thể rời nhóm" };
  await prisma.leagueMember.deleteMany({ where: { leagueId, userId } });
  return { ok: true };
}

export async function getMyLeagues(userId: string) {
  const memberships = await prisma.leagueMember.findMany({
    where: { userId },
    include: { league: { include: { _count: { select: { members: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({
    id: m.league.id,
    name: m.league.name,
    code: m.league.code,
    ownerId: m.league.ownerId,
    memberCount: m.league._count.members,
  }));
}

export type LeagueMemberRow = {
  id: string;
  name: string | null;
  image: string | null;
  balance: number;
};

export type LeagueData = {
  league: { id: string; name: string; code: string; ownerId: string };
  members: LeagueMemberRow[];
};

export async function getLeagueByCode(code: string): Promise<LeagueData | null> {
  const league = await prisma.league.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true, balance: true } } },
      },
    },
  });
  if (!league) return null;
  const members = league.members.map((m) => m.user).sort((a, b) => b.balance - a.balance);
  return {
    league: { id: league.id, name: league.name, code: league.code, ownerId: league.ownerId },
    members,
  };
}

export async function isMember(userId: string, leagueId: string): Promise<boolean> {
  const m = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
    select: { id: true },
  });
  return Boolean(m);
}
