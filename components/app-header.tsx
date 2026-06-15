import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getBalance } from "@/lib/economy";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export async function AppHeader() {
  const session = await auth();
  const balance = session?.user?.id ? await getBalance(session.user.id) : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-sm font-bold leading-tight">
        👑 Đường Đến Ngai Vàng
        <span className="block text-xs font-normal text-muted-foreground">World Cup 2026</span>
      </Link>
      {session?.user ? (
        <div className="flex items-center gap-2">
          <Link
            href="/vi"
            className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums hover:bg-muted/70 transition-colors"
          >
            💰 {fmt(balance ?? 0)}đ
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-xs text-muted-foreground underline">Đăng xuất</button>
          </form>
        </div>
      ) : (
        <Link href="/login" className="text-xs font-medium text-primary underline">
          Đăng nhập
        </Link>
      )}
    </header>
  );
}
