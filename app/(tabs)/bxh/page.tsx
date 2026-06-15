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
    <span className="w-7 text-center text-sm font-semibold tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
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
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
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
        <h1 className="text-lg font-semibold">Bảng xếp hạng</h1>
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
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  isCurrentUser
                    ? "border-primary/30 bg-accent ring-1 ring-primary/30"
                    : "bg-card"
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
                <span className="shrink-0 text-sm font-bold tabular-nums">
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
