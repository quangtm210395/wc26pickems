import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { auth } from "@/auth";
import {
  getPostBySlug,
  POST_TYPE_LABEL,
  snippetFromMarkdown,
  postOgImagePath,
} from "@/lib/posts";
import { vnDateLabel } from "@/lib/matches";
import { SITE_NAME } from "@/lib/site";
import { ArticleShareButton } from "@/components/article-share-button";
import type { Post } from "@prisma/client";

// ─── Badge colors per type ────────────────────────────────────────────────────

const TYPE_COLOR: Record<Post["type"], string> = {
  PREVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  RECAP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ANALYSIS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  TIP: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

// ─── Metadata (SEO + preview khi share lên chat) ──────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  // Bài không tồn tại / còn nháp → không lộ nội dung, không cho index.
  if (!post || post.status !== "PUBLISHED") {
    return { title: "Tin tức", robots: { index: false, follow: false } };
  }

  const title = post.title;
  const description = snippetFromMarkdown(post.body, 160);
  const url = `/tin/${post.slug}`;
  const image = postOgImagePath(post);
  const publishedTime = (post.publishedAt ?? post.createdAt).toISOString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "vi_VN",
      publishedTime,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  // Draft check: non-admins cannot see drafts
  if (post.status === "DRAFT") {
    const session = await auth();
    if (session?.user?.role !== "admin") notFound();
  }

  const date = post.publishedAt ?? post.createdAt;
  const author = post.authorType === "AI" ? "🤖 AI" : "✍️ BBT";

  return (
    <article className="space-y-4 pb-10">
      {/* Back link + nút chia sẻ */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/tin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground active:opacity-70"
        >
          ← Tin tức
        </Link>
        <ArticleShareButton slug={post.slug} title={post.title} />
      </div>

      {/* Type badge */}
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLOR[post.type]}`}
      >
        {POST_TYPE_LABEL[post.type]}
      </span>

      {/* Title */}
      <h1 className="text-xl font-bold leading-snug">{post.title}</h1>

      {/* Meta: date + author */}
      <p className="text-xs text-muted-foreground">
        {vnDateLabel(date)} · {author}
        {post.status === "DRAFT" && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px]">nháp</span>
        )}
      </p>

      {/* Match link */}
      {post.matchId && (
        <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-xs text-muted-foreground">Trận liên quan: </span>
          <Link
            href={`/match/${post.matchId}`}
            className="text-xs font-medium underline hover:no-underline"
          >
            Xem trận đấu →
          </Link>
        </div>
      )}

      {/* Markdown body */}
      <div className="space-y-3 text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_a]:underline [&_a]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:text-xs [&_strong]:font-semibold [&_p]:mt-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>
    </article>
  );
}
