import Link from "next/link";
import { auth } from "@/auth";
import { getMyLeagues } from "@/lib/leagues";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createLeagueAction, joinByCodeAction } from "./actions";

export default async function NhomPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-4xl">🤝</span>
            <h1 className="font-display text-lg font-bold uppercase tracking-tight">Nhóm đua riêng</h1>
            <p className="text-sm text-muted-foreground">
              Đăng nhập để tạo nhóm đua riêng với bạn bè.
            </p>
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2 font-display text-sm font-semibold uppercase tracking-wide text-primary-foreground"
            >
              Đăng nhập
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { error } = await searchParams;
  const leagues = await getMyLeagues(session.user.id);

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold uppercase tracking-tight">
        <span className="h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_0_rgba(231,180,58,0.6)]" />
        Nhóm đua riêng
      </h1>
      <p className="text-sm text-muted-foreground">
        Lập nhóm đua dự đoán riêng với hội bạn, có bảng xếp hạng riêng để khoe.
      </p>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Tạo nhóm */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Tạo nhóm mới</h2>
          <form action={createLeagueAction} className="flex gap-2">
            <input
              name="name"
              maxLength={40}
              required
              placeholder="Tên nhóm (vd: Hội Cú Đêm)"
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/40"
            />
            <Button type="submit" className="h-11 shrink-0 px-4">
              Tạo
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tham gia bằng mã */}
      <Card>
        <CardContent className="space-y-3 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
            Tham gia bằng mã
          </h2>
          <form action={joinByCodeAction} className="flex gap-2">
            <input
              name="code"
              required
              placeholder="Nhập mã nhóm (vd: K7P2QX)"
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm uppercase tracking-widest outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/40"
            />
            <Button type="submit" variant="secondary" className="h-11 shrink-0 px-4">
              Vào
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Nhóm của tôi */}
      <div className="space-y-2">
        <h2 className="section-heading">Nhóm của tôi</h2>
        {leagues.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Bạn chưa ở nhóm nào. Tạo một nhóm và rủ hội bạn vào nào!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {leagues.map((lg) => (
              <Link key={lg.id} href={`/nhom/${lg.code}`} className="block">
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {lg.name}
                        {lg.ownerId === session.user!.id && (
                          <span className="ml-1 text-xs text-primary">· chủ nhóm</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lg.memberCount} thành viên · mã {lg.code}
                      </p>
                    </div>
                    <span className="shrink-0 text-muted-foreground">›</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
