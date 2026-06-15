import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/ai-author";

const MODEL = process.env.AI_MODEL ?? "claude-opus-4-8";

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

/**
 * Trả lời câu hỏi CHỈ dựa trên các bài đã publish (grounded RAG).
 * - Không có bài liên quan → từ chối, không gọi Claude.
 * - Có bài → Claude trả lời chỉ theo context + trích dẫn nguồn.
 */
export async function answerQuestion(
  question: string,
): Promise<{ answer: string; sources: Source[] }> {
  const published = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { title: true, body: true, slug: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });
  const top = rankPosts(published, question, 4);

  if (top.length === 0) {
    return {
      answer:
        "Mình chưa có bài viết nào liên quan tới câu hỏi này. Bạn xem thêm ở mục Tin tức nhé!",
      sources: [],
    };
  }
  if (!aiConfigured()) {
    return {
      answer:
        "Chatbot AI chưa được bật (thiếu ANTHROPIC_API_KEY). Nhưng có vài bài liên quan dưới đây:",
      sources: top.map((p) => ({ title: p.title, slug: p.slug })),
    };
  }

  const client = new Anthropic();
  const context = top.map((p, i) => `### Bài ${i + 1}: ${p.title}\n${p.body}`).join("\n\n");
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system:
      "Bạn là trợ lý hỏi đáp của app dự đoán World Cup. CHỈ trả lời dựa trên các bài viết được cung cấp bên dưới. " +
      "Nếu câu trả lời không có trong các bài, hãy nói rõ là chưa có bài viết đề cập và khuyên người dùng xem mục Tin tức. " +
      "Trả lời bằng tiếng Việt, ngắn gọn, thân thiện. TUYỆT ĐỐI không bịa thông tin ngoài các bài.",
    messages: [
      {
        role: "user",
        content: `Các bài viết hiện có:\n\n${context}\n\n---\nCâu hỏi của người dùng: ${question}`,
      },
    ],
  });

  const answer = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return {
    answer: answer || "Xin lỗi, mình chưa trả lời được câu này.",
    sources: top.map((p) => ({ title: p.title, slug: p.slug })),
  };
}
