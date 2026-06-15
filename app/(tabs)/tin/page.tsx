import Link from "next/link";
import { auth } from "@/auth";
import { getPublishedPosts, getDraftPosts, snippetFromMarkdown, POST_TYPE_LABEL } from "@/lib/posts";
import { vnDateLabel } from "@/lib/matches";
import { PublishButton } from "@/components/publish-button";
import type { Post } from "@prisma/client";

// ─── Badge colors per type ────────────────────────────────────────────────────

const TYPE_COLOR: Record<Post["type"], string> = {
  PREVIEW: "border border-sky-400/30 bg-sky-400/10 text-sky-300",
  RECAP: "border border-violet-400/30 bg-violet-400/10 text-violet-300",
  ANALYSIS: "border border-primary/30 bg-primary/10 text-primary",
  TIP: "border border-accent/40 bg-accent/20 text-emerald-300",
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
    <div className="rounded-xl border border-border bg-card p-3 space-y-2 transition-colors hover:border-primary/30">
      <div className="flex items-center gap-2">
        <TypeBadge type={post.type} />
        <span className="text-[11px] text-muted-foreground">
          {vnDateLabel(date)}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{author}</span>
      </div>
      <Link
        href={`/tin/${post.slug}`}
        className="block font-display text-base font-semibold leading-snug hover:text-primary active:opacity-70"
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2">
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
        <h1 className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
          <span className="h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_0_rgba(231,180,58,0.6)]" />
          Tin tức
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          AI lên bài hằng ngày · soi kèo · nhận định
        </p>
      </div>

      {/* Admin: Chờ duyệt section */}
      {isAdmin && drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-heading">
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
        <div className="rounded-xl border border-border bg-card p-6 text-center">
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
