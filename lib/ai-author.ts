import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Mặc định Opus 4.8 (model mạnh nhất); đổi qua env AI_MODEL nếu muốn rẻ hơn.
const MODEL = process.env.AI_MODEL ?? "claude-opus-4-8";

const PostSchema = z.object({
  title: z.string().describe("Tiêu đề tiếng Việt, hấp dẫn, ≤ 80 ký tự"),
  body: z.string().describe("Nội dung markdown tiếng Việt, 150–300 từ"),
});

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "bai-viet";
  // hậu tố ngắn theo thời gian để tránh trùng (chạy ở Node runtime)
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

const SYSTEM = `Bạn là bình luận viên kiêm chuyên gia soi kèo bóng đá người Việt, văn phong gần gũi, dí dỏm vừa phải, viết bằng tiếng Việt.
Viết ngắn gọn, có nhận định và gợi ý kèo cho vui (đây là sân chơi điểm ảo, không cá cược tiền thật).
TUYỆT ĐỐI không bịa ra số liệu cụ thể (tỉ số lịch sử, thống kê) mà bạn không được cung cấp trong dữ liệu trận. Có thể nhận định chung chung dựa trên tên đội.`;

type MatchInfo = {
  id: string;
  stage: string;
  groupName: string | null;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
  stats: unknown;
};

async function writePost(
  client: Anthropic,
  m: MatchInfo,
  kind: "PREVIEW" | "RECAP",
): Promise<{ title: string; body: string }> {
  const where = m.groupName ? `bảng ${m.groupName}` : m.stage;
  const prompt =
    kind === "PREVIEW"
      ? `Trận sắp diễn ra (${where}): ${m.homeName} vs ${m.awayName}. Viết bài NHẬN ĐỊNH TRƯỚC TRẬN kèm soi kèo: dự đoán cục diện, tỉ số có thể, gợi ý 1 kèo (1x2 hoặc tài/xỉu) cho vui.`
      : `Trận đã kết thúc (${where}): ${m.homeName} ${m.homeScore}–${m.awayScore} ${m.awayName}. Thông số trận: ${JSON.stringify(
          m.stats ?? {},
        )}. Viết bài TỔNG KẾT SAU TRẬN: diễn biến chính, điểm nhấn, nhận xét.`;

  const res = await client.messages.parse({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(PostSchema) },
  });

  return res.parsed_output ?? { title: `${m.homeName} vs ${m.awayName}`, body: "" };
}

/** Sinh bài DRAFT cho các trận sắp đá (PREVIEW) và vừa đá xong (RECAP). Idempotent theo (match, type). */
export async function generateDailyPosts(opts?: {
  limitPreview?: number;
  limitRecap?: number;
}): Promise<{ created: number; ids: string[] }> {
  if (!aiConfigured()) throw new Error("ANTHROPIC_API_KEY chưa cấu hình");
  const client = new Anthropic();
  const now = new Date();
  const horizon = new Date(now.getTime() + 3 * 864e5);

  const upcoming = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      kickoff: { gte: now, lte: horizon },
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
    take: opts?.limitPreview ?? 3,
  });
  const recent = await prisma.match.findMany({
    where: { status: "FINISHED" },
    include: { homeTeam: true, awayTeam: true, stats: true },
    orderBy: { kickoff: "desc" },
    take: opts?.limitRecap ?? 2,
  });

  const ids: string[] = [];

  async function maybeCreate(
    match: (typeof upcoming)[number] | (typeof recent)[number],
    kind: "PREVIEW" | "RECAP",
  ) {
    const exists = await prisma.post.findFirst({ where: { matchId: match.id, type: kind } });
    if (exists) return;
    const info: MatchInfo = {
      id: match.id,
      stage: match.stage,
      groupName: match.groupName,
      homeName: match.homeTeam?.name ?? "TBD",
      awayName: match.awayTeam?.name ?? "TBD",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stats: "stats" in match ? match.stats : null,
    };
    const { title, body } = await writePost(client, info, kind);
    const post = await prisma.post.create({
      data: {
        slug: await uniqueSlug(title),
        title,
        body,
        type: kind,
        status: "DRAFT",
        authorType: "AI",
        matchId: match.id,
      },
    });
    ids.push(post.id);
  }

  for (const m of upcoming) await maybeCreate(m, "PREVIEW");
  for (const m of recent) await maybeCreate(m, "RECAP");

  return { created: ids.length, ids };
}
