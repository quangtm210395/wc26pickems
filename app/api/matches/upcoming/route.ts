import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public: danh sách trận sắp diễn ra (cho cron AI biết viết bài về trận nào).
export async function GET() {
  const now = new Date();
  const ms = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoff: { gt: now },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
    take: 8,
  });
  return NextResponse.json(
    ms.map((m) => ({
      externalId: m.externalId,
      group: m.groupName,
      stage: m.stage,
      kickoff: m.kickoff.toISOString(),
      home: { code: m.homeTeam?.code, name: m.homeTeam?.name },
      away: { code: m.awayTeam?.code, name: m.awayTeam?.name },
    })),
  );
}
