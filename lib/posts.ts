import { prisma } from "@/lib/prisma";
import type { Post } from "@prisma/client";

export type { Post };

export const POST_TYPE_LABEL: Record<Post["type"], string> = {
  PREVIEW: "Trước trận",
  RECAP: "Sau trận",
  ANALYSIS: "Nhận định",
  TIP: "Soi kèo",
};

export async function getPublishedPosts(limit = 30): Promise<Post[]> {
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export async function getDraftPosts(): Promise<Post[]> {
  return prisma.post.findMany({
    where: { status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return prisma.post.findUnique({ where: { slug } });
}

/** Lấy ~120 ký tự snippet từ markdown, loại bỏ các ký tự định dạng thô. */
export function snippetFromMarkdown(body: string, maxLen = 120): string {
  const stripped = body
    .replace(/#{1,6}\s+/g, "") // headings
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // bold/italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // inline code / code blocks
    .replace(/^[-*+]\s+/gm, "") // list bullets
    .replace(/^\d+\.\s+/gm, "") // ordered list
    .replace(/>\s+/g, "") // blockquotes
    .replace(/\n+/g, " ")
    .trim();
  return stripped.length > maxLen ? stripped.slice(0, maxLen) + "…" : stripped;
}
