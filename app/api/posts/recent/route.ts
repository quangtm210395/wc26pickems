import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public: bài đã đăng gần đây (cho cron AI tránh đăng trùng trận).
export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 15,
    select: {
      title: true,
      type: true,
      publishedAt: true,
      match: { select: { externalId: true } },
    },
  });
  return NextResponse.json(
    posts.map((p) => ({
      title: p.title,
      type: p.type,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      matchExternalId: p.match?.externalId ?? null,
    })),
  );
}
