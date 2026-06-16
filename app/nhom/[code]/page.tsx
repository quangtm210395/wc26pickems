import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getLeagueByCode, isMember } from "@/lib/leagues";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShareButton } from "@/components/share-button";
import { joinThisLeagueAction, leaveLeagueAction } from "../actions";

const fmt = (n: number) => n.toLocaleString("vi-VN") + "đ";

function RankBadge({ rank }: { rank: number }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  if (medal) return <span className="text-xl leading-none">{medal}</span>;
  return (
    <span className="w-7 text-center font-display text-base font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  if (image)
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name ?? "avatar"}
        className="size-9 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-display text-sm font-bold text-primary">
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const data = await getLeagueByCode(code);
  if (!data) return { title: "Nhóm không tồn tại" };
  const leader = data.members[0]?.name ?? "—";
  const og = `/api/og?kind=league&name=${encodeURIComponent(data.league.name)}&count=${data.members.length}&leader=${encodeURIComponent(leader)}`;
  return {
    title: `${data.league.name} — BXH nhóm | World Cup 2026`,
    description: `Nhóm "${data.league.name}" có ${data.members.length} thành viên đang đua dự đoán World Cup 2026. Vào đua với hội!`,
    openGraph: {
      title: `${data.league.name} · BXH nhóm World Cup 2026`,
      description: `${data.members.length} thành viên đang đua · dẫn đầu: ${leader}`,
      images: [{ url: og, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.league.name} · BXH nhóm World Cup 2026`,
      images: [og],
    },
  };
}

export default async function LeaguePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getLeagueByCode(code);
  if (!data) notFound();

  const session = await auth();
  const uid = session?.user?.id ?? null;
  const member = uid ? await isMember(uid, data.league.id) : false;
  const isOwner = uid === data.league.ownerId;

  const caption = `⚽ Vào nhóm "${data.league.name}" đua dự đoán World Cup 2026 với mình nào! Ai soi kèo đỉnh nhất hội? 👑 Tham gia 👇`;

  return (
    <div className="space-y-4">
      <Link href="/nhom" className="text-xs text-muted-foreground">
        ← Nhóm của tôi
      </Link>

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="text-2xl">🏆</span>
          {data.league.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.members.length} thành viên · mã nhóm{" "}
          <span className="font-mono font-semibold tracking-widest text-foreground">
            {data.league.code}
          </span>
        </p>
      </div>

      {/* Mời bạn / chia sẻ */}
      <Card className="ring-primary/15">
        <CardContent className="space-y-2 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mời bạn vào nhóm
          </p>
          <ShareButton path={`/nhom/${data.league.code}`} caption={caption} label="Chia sẻ nhóm" />
        </CardContent>
      </Card>

      {/* Join CTA nếu chưa là thành viên */}
      {!member &&
        (uid ? (
          <form action={joinThisLeagueAction.bind(null, data.league.code)}>
            <Button type="submit" className="h-11 w-full">
              Tham gia nhóm này
            </Button>
          </form>
        ) : (
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary px-6 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground"
          >
            Đăng nhập để tham gia
          </Link>
        ))}

      {/* BXH nhóm */}
      <div className="space-y-1.5">
        <h2 className="section-heading">Bảng xếp hạng nhóm</h2>
        {data.members.map((m, i) => {
          const rank = i + 1;
          const me = m.id === uid;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                me
                  ? "border-primary/40 bg-primary/10 ring-1 ring-primary/40"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex w-7 shrink-0 items-center justify-center">
                <RankBadge rank={rank} />
              </div>
              <Avatar name={m.name} image={m.image} />
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">
                  {m.name ?? "Người chơi ẩn danh"}
                  {m.id === data.league.ownerId && (
                    <span className="ml-1 text-xs text-primary">👑</span>
                  )}
                  {me && <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>}
                </p>
              </div>
              <span className="shrink-0 font-display text-base font-bold tabular-nums text-primary">
                {fmt(m.balance)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rời nhóm (không phải chủ nhóm) */}
      {member && !isOwner && (
        <form action={leaveLeagueAction.bind(null, data.league.id)}>
          <button
            type="submit"
            className="w-full py-2 text-center text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
          >
            Rời khỏi nhóm
          </button>
        </form>
      )}
    </div>
  );
}
