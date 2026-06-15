import { NextResponse } from "next/server";
import { generateDailyPosts, aiConfigured } from "@/lib/ai-author";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!aiConfigured()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY chưa cấu hình" }, { status: 503 });
  }
  try {
    const result = await generateDailyPosts();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
