import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";

async function getUserWithRank(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, balance: true },
  });
  if (!user) return null;

  const rank =
    (await prisma.user.count({
      where: { balance: { gt: user.balance } },
    })) + 1;

  return { ...user, rank };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}): Promise<Metadata> {
  const { userId } = await params;
  const data = await getUserWithRank(userId);

  if (!data) {
    return { title: "Người dùng không tồn tại" };
  }

  const name = encodeURIComponent(data.name ?? "Người chơi");
  const rank = encodeURIComponent(String(data.rank));
  const points = encodeURIComponent(String(data.balance));

  const ogUrl = `/api/og?name=${name}&rank=${rank}&points=${points}`;
  const displayName = data.name ?? "Người chơi";

  return {
    title: `${displayName} — Hạng #${data.rank} · ${data.balance.toLocaleString("vi-VN")}đ | World Cup 2026`,
    description: `${displayName} đang xếp hạng #${data.rank} với ${data.balance.toLocaleString("vi-VN")} điểm trong Đường Đến Ngai Vàng World Cup 2026. Chơi thử xem bạn đứng hạng mấy!`,
    openGraph: {
      title: `${displayName} — Hạng #${data.rank} tại World Cup 2026`,
      description: `${data.balance.toLocaleString("vi-VN")} điểm ảo · Đường Đến Ngai Vàng World Cup 2026`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} — Hạng #${data.rank} tại World Cup 2026`,
      description: `${data.balance.toLocaleString("vi-VN")} điểm ảo · chơi cho vui`,
      images: [ogUrl],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const data = await getUserWithRank(userId);

  if (!data) notFound();

  const displayName = data.name ?? "Người chơi";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        {/* OG preview card */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-4xl">👑</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Đường Đến Ngai Vàng · World Cup 2026
                </p>
                <h1 className="mt-1 text-xl font-bold">{displayName}</h1>
              </div>
              <div className="flex gap-8">
                <div className="text-center">
                  <p className="text-3xl font-black tabular-nums text-amber-500">
                    #{data.rank}
                  </p>
                  <p className="text-xs text-muted-foreground">Hạng</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black tabular-nums text-emerald-500">
                    {data.balance.toLocaleString("vi-VN")}đ
                  </p>
                  <p className="text-xs text-muted-foreground">Điểm</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">điểm ảo · chơi cho vui</p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex min-h-[44px] items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Vào chơi ngay
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Chia sẻ trang này để thách thức bạn bè leo bảng xếp hạng World Cup 2026!
          </p>
        </div>
      </div>
    </div>
  );
}
