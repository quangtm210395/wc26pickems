import type { Stage, MarketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chatComplete, llmConfigured } from "@/lib/llm";
import { getBalance } from "@/lib/economy";
import { vnTime, vnDateKey } from "@/lib/matches";

export function stripDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase() // lowercase trước để Đ → đ rồi mới thay đ → d
    .replace(/đ/g, "d");
}

// Từ chức năng phổ biến — bỏ để tránh khớp lan man mọi bài.
const STOPWORDS = new Set([
  "la", "va", "co", "cua", "cho", "voi", "khong", "mot", "cac", "nay", "khi", "se", "da", "gi",
  "sao", "the", "nao", "lien", "quan", "thi", "ma", "hay", "neu", "con", "cung", "trong", "minh",
  "ban", "hoi", "ai", "nhung", "hoac", "thi",
]);

export function queryTerms(q: string): string[] {
  return stripDiacritics(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

export type RankablePost = { title: string; body: string };

/** Điểm liên quan: mỗi term khớp body +1, khớp tiêu đề thêm +1. */
export function scorePost(post: RankablePost, terms: string[]): number {
  if (terms.length === 0) return 0;
  const hay = stripDiacritics(`${post.title} ${post.body}`);
  const titleHay = stripDiacritics(post.title);
  let score = 0;
  for (const t of terms) {
    if (hay.includes(t)) score += 1;
    if (titleHay.includes(t)) score += 1;
  }
  return score;
}

/** Xếp hạng bài theo độ liên quan với câu hỏi; loại bài không khớp (score 0). */
export function rankPosts<T extends RankablePost>(posts: T[], query: string, k = 4): T[] {
  const terms = queryTerms(query);
  return posts
    .map((p) => ({ p, s: scorePost(p, terms) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.p);
}

export type Source = { title: string; slug: string };

const STAGE_LABELS: Record<Stage, string> = {
  GROUP: "Vòng bảng",
  R32: "Vòng 1/16",
  R16: "Vòng 1/8",
  QF: "Tứ kết",
  SF: "Bán kết",
  THIRD: "Tranh hạng 3",
  FINAL: "Chung kết",
};

const MARKET_TYPE_LABELS: Record<MarketType, string> = {
  MATCH_1X2: "1x2",
  GOALS_OU: "Tài/Xỉu bàn thắng",
  CORNERS_OU: "Phạt góc",
  CARDS_OU: "Thẻ",
};

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

/** Lịch + kết quả toàn giải (đã có 2 đội), 1 dòng/trận theo giờ VN — grounding sự kiện. */
async function buildFixturesContext(): Promise<string> {
  const matches = await prisma.match.findMany({
    where: { homeTeamId: { not: null }, awayTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { kickoff: "asc" },
  });
  if (matches.length === 0) return "(chưa có lịch thi đấu)";
  return matches
    .map((m) => {
      const [, mo, d] = vnDateKey(m.kickoff).split("-");
      const when = `${d}/${mo} ${vnTime(m.kickoff)}`;
      const stage = m.stage === "GROUP" ? `Bảng ${m.groupName ?? "?"}` : STAGE_LABELS[m.stage];
      const home = m.homeTeam?.name ?? "?";
      const away = m.awayTeam?.name ?? "?";
      let result: string;
      if (m.status === "FINISHED" && m.homeScore != null && m.awayScore != null) {
        const pens =
          m.homePens != null && m.awayPens != null ? ` (pen ${m.homePens}-${m.awayPens})` : "";
        result = `kết thúc ${m.homeScore}-${m.awayScore}${pens}`;
      } else if (m.status === "LIVE") result = "đang đá";
      else if (m.status === "POSTPONED") result = "hoãn";
      else result = "chưa đá";
      return `[${when} VN] ${stage}: ${home} vs ${away} — ${result}`;
    })
    .join("\n");
}

/** Dữ liệu RIÊNG của người dùng đang hỏi: số dư + lịch sử pickem + lịch sử cược. */
async function buildUserContext(userId: string): Promise<string> {
  const [balance, picks, bets] = await Promise.all([
    getBalance(userId),
    prisma.pick.findMany({
      where: { userId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.bet.findMany({
      where: { userId },
      include: { market: { include: { match: { include: { homeTeam: true, awayTeam: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const lines: string[] = [`Số dư hiện tại: ${fmtVnd(balance)}.`];

  if (picks.length) {
    lines.push(`Lịch sử Pickems (${picks.length} lượt):`);
    for (const p of picks) {
      const h = p.match.homeTeam?.name ?? "?";
      const a = p.match.awayTeam?.name ?? "?";
      const choice = p.choice === "HOME" ? `Thắng ${h}` : p.choice === "AWAY" ? `Thắng ${a}` : "Hòa";
      const st =
        p.status === "WON" ? `THẮNG +${p.points}đ` : p.status === "LOST" ? "THUA" : "đang chờ";
      lines.push(`- ${h} vs ${a}: chọn ${choice} → ${st}`);
    }
  } else {
    lines.push("Chưa tham gia lượt Pickems nào.");
  }

  if (bets.length) {
    lines.push(`Lịch sử cược (${bets.length} kèo):`);
    for (const b of bets) {
      const mt = b.market.match;
      const h = mt.homeTeam?.name ?? "?";
      const a = mt.awayTeam?.name ?? "?";
      const st =
        b.status === "WON"
          ? `THẮNG +${fmtVnd(b.payout ?? 0)}`
          : b.status === "LOST"
            ? "THUA"
            : b.status === "VOID"
              ? "hoàn"
              : "đang chờ";
      lines.push(
        `- ${MARKET_TYPE_LABELS[b.market.type]} ${h} vs ${a}: cửa ${b.selectionKey}, cược ${fmtVnd(b.stake)} → ${st}`,
      );
    }
  }

  return "## DỮ LIỆU CỦA BẠN (người dùng đang hỏi)\n" + lines.join("\n");
}

const SYSTEM_PROMPT =
  'Bạn là trợ lý của app dự đoán World Cup 2026 "Đường Đến Ngai Vàng" (chơi điểm ảo, KHÔNG tiền thật). ' +
  "Trả lời câu hỏi DỰA TRÊN dữ liệu được cung cấp bên dưới, gồm: (1) bài viết đã đăng, (2) LỊCH & KẾT QUẢ trận đấu, " +
  "(3) DỮ LIỆU CỦA CHÍNH NGƯỜI DÙNG (số dư, lịch sử pickem, lịch sử cược) nếu có. Quy tắc:\n" +
  "- CHỈ dùng dữ liệu được cung cấp. Nếu thông tin không có, nói rõ là chưa có/không rõ và gợi ý xem mục Lịch hoặc Tin tức. " +
  "TUYỆT ĐỐI không bịa tỉ số, đội hình, thống kê hay lịch sử ngoài dữ liệu.\n" +
  '- Phần "DỮ LIỆU CỦA BẠN" là của riêng người dùng đang hỏi; không suy đoán dữ liệu của người khác.\n' +
  "- Giờ trận đấu hiển thị theo giờ Việt Nam (VN).\n" +
  "- Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.";

/**
 * Trợ lý hỏi đáp grounded: trả lời dựa trên bài đã đăng + lịch/kết quả trận đấu
 * + dữ liệu riêng của người dùng (nếu đăng nhập). Không bịa ngoài dữ liệu cung cấp.
 */
export async function answerQuestion(
  question: string,
  opts: { userId?: string } = {},
): Promise<{ answer: string; sources: Source[] }> {
  const published = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { title: true, body: true, slug: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  const topPosts = rankPosts(published, question, 4);
  const sources = topPosts.map((p) => ({ title: p.title, slug: p.slug }));

  if (!llmConfigured()) {
    return {
      answer:
        topPosts.length > 0
          ? "Chatbot AI chưa được bật. Nhưng có vài bài liên quan dưới đây:"
          : "Chatbot AI chưa được bật. Bạn xem mục Lịch hoặc Tin tức nhé!",
      sources,
    };
  }

  const [fixtures, userBlock] = await Promise.all([
    buildFixturesContext(),
    opts.userId ? buildUserContext(opts.userId) : Promise.resolve(""),
  ]);

  const parts: string[] = [];
  if (topPosts.length) {
    parts.push(
      "## BÀI VIẾT LIÊN QUAN\n" +
        topPosts.map((p, i) => `### Bài ${i + 1}: ${p.title}\n${p.body}`).join("\n\n"),
    );
  }
  parts.push("## LỊCH & KẾT QUẢ TRẬN ĐẤU\n" + fixtures);
  if (userBlock) parts.push(userBlock);
  const context = parts.join("\n\n");

  try {
    const answer = await chatComplete(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `DỮ LIỆU:\n\n${context}\n\n---\nCâu hỏi của người dùng: ${question}` },
      ],
      { maxTokens: 800, temperature: 0.3 },
    );
    return { answer: answer || "Xin lỗi, mình chưa trả lời được câu này.", sources };
  } catch (err) {
    console.error("[rag] chatComplete failed:", err);
    return {
      answer: "Xin lỗi, trợ lý đang bận chút, bạn thử lại sau nhé!",
      sources,
    };
  }
}
