import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { PostType } from "@prisma/client";

export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "bai-viet"
  );
}

const TYPES: PostType[] = ["PREVIEW", "RECAP", "ANALYSIS", "TIP"];

// Đăng bài (AI viết sẵn nội dung, gửi vào đây). Bảo vệ bằng CRON_SECRET.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { title?: string; body?: string; type?: string; matchExternalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  const content = (body.body ?? "").trim();
  if (!title || !content) {
    return NextResponse.json({ error: "thiếu title/body" }, { status: 400 });
  }
  const type: PostType = TYPES.includes(body.type as PostType) ? (body.type as PostType) : "ANALYSIS";

  let matchId: string | undefined;
  if (body.matchExternalId) {
    const m = await prisma.match.findUnique({
      where: { externalId: body.matchExternalId },
      select: { id: true },
    });
    matchId = m?.id;
  }

  const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`;
  const post = await prisma.post.create({
    data: {
      slug,
      title,
      body: content,
      type,
      status: "PUBLISHED",
      authorType: "AI",
      publishedAt: new Date(),
      matchId,
    },
  });
  return NextResponse.json({ ok: true, id: post.id, slug: post.slug });
}
