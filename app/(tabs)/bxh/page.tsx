import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ShareButton } from "@/components/share-button";

function formatBalance(n: number): string {
  return n.toLocaleString("vi-VN") + "đ";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none">🥇</span>;
  if (rank === 2) return <span className="text-xl leading-none">🥈</span>;
  if (rank === 3) return <span className="text-xl leading-none">🥉</span>;
  return (
    <span className="w-7 text-center font-display text-base font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}

// Gold / silver / bronze left-border accent for the podium rows.
function podiumAccent(rank: number): string {
  if (rank === 1) return "border-l-2 border-l-[#E7B43A]";
  if (rank === 2) return "border-l-2 border-l-[#C9CDD6]";
  if (rank === 3) return "border-l-2 border-l-[#C58A4B]";
  return "";
}

function AvatarInitial({ name, image }: { name: string | null; image: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name ?? "avatar"}
        className="size-9 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 font-display text-sm font-bold text-primary">
      {initial}
    </div>
  );
}

export default async function BxhPage() {
  const session = await auth();
  const currentUserId = session?.user?.id ?? null;

  const topUsers = await prisma.user.findMany({
    orderBy: { balance: "desc" },
    take: 100,
    select: { id: true, name: true, image: true, balance: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
          <span className="h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_0_rgba(231,180,58,0.6)]" />
          Bảng xếp hạng
        </h1>
        {currentUserId && <ShareButton userId={currentUserId} />}
      </div>

      {topUsers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có người chơi nào.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {topUsers.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = user.id === currentUserId;
            return (
              <div
                key={user.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  isCurrentUser
                    ? "border-primary/40 bg-primary/10 ring-1 ring-primary/40"
                    : `border-border bg-card ${podiumAccent(rank)}`
                }`}
              >
                <div className="flex w-7 shrink-0 items-center justify-center">
                  <RankBadge rank={rank} />
                </div>
                <AvatarInitial name={user.name} image={user.image} />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">
                    {user.name ?? "Người chơi ẩn danh"}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-muted-foreground">(bạn)</span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 font-display text-base font-bold tabular-nums text-primary">
                  {formatBalance(user.balance)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
