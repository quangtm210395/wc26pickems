import Link from "next/link";
import { auth } from "@/auth";
import { getPublishedPosts, getDraftPosts, snippetFromMarkdown, POST_TYPE_LABEL } from "@/lib/posts";
import { vnDateLabel } from "@/lib/matches";
import { PublishButton } from "@/components/publish-button";
import type { Post } from "@prisma/client";

// ─── Badge colors per type ────────────────────────────────────────────────────

const TYPE_COLOR: Record<Post["type"], string> = {
  PREVIEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  RECAP: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  ANALYSIS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  TIP: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

// ─── Type pill ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: Post["type"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLOR[type]}`}
    >
      {POST_TYPE_LABEL[type]}
    </span>
  );
}

// ─── Single post card ─────────────────────────────────────────────────────────

function PostCard({ post }: { post: Post }) {
  const date = post.publishedAt ?? post.createdAt;
  const author = post.authorType === "AI" ? "🤖 AI" : "✍️ BBT";
  const snippet = snippetFromMarkdown(post.body);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <TypeBadge type={post.type} />
        <span className="text-[11px] text-muted-foreground">
          {vnDateLabel(date)}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{author}</span>
      </div>
      <Link
        href={`/tin/${post.slug}`}
        className="block text-sm font-semibold leading-snug hover:underline active:opacity-70"
      >
        {post.title}
      </Link>
      {snippet && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{snippet}</p>
      )}
    </div>
  );
}

// ─── Draft row (admin only) ───────────────────────────────────────────────────

function DraftRow({ post }: { post: Post }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            nháp
          </span>
          <TypeBadge type={post.type} />
        </div>
        <p className="mt-1 text-sm font-medium truncate">{post.title}</p>
      </div>
      <PublishButton postId={post.id} />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TinPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const [published, drafts] = await Promise.all([
    getPublishedPosts(30),
    isAdmin ? getDraftPosts() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold">Tin tức</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          AI lên bài hằng ngày · soi kèo · nhận định
        </p>
      </div>

      {/* Admin: Chờ duyệt section */}
      {isAdmin && drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Chờ duyệt ({drafts.length})
          </h2>
          <div className="space-y-2">
            {drafts.map((post) => (
              <DraftRow key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Published posts */}
      {published.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có bài viết. AI sẽ lên bài khi giải diễn ra.
          </p>
        </div>
      ) : (
        <section className="space-y-2">
          <div className="space-y-2">
            {published.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
