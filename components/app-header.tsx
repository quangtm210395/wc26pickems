import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getBalance } from "@/lib/economy";
import { ReferralClaim } from "@/components/referral-claim";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export async function AppHeader() {
  const session = await auth();
  const balance = session?.user?.id ? await getBalance(session.user.id) : null;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-primary/15 bg-background/85 px-4 shadow-[0_1px_0_0_rgba(231,180,58,0.18),0_8px_24px_-20px_rgba(231,180,58,0.6)] backdrop-blur-md">
      <Link href="/" className="flex items-center gap-1.5 leading-none">
        <span className="text-lg leading-none">👑</span>
        <span className="leading-tight">
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.08em] text-primary">
            Đường Đến Ngai Vàng
          </span>
          <span className="block font-display text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            World Cup 2026
          </span>
        </span>
      </Link>
      {session?.user ? (
        <div className="flex items-center gap-2">
          <ReferralClaim />
          <Link
            href="/vi"
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-display text-xs font-semibold tabular-nums text-primary shadow-[0_0_12px_-4px_rgba(231,180,58,0.5)] transition-colors hover:bg-primary/15"
          >
            💰 {fmt(balance ?? 0)}đ
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Đăng xuất
            </button>
          </form>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary/15"
        >
          Đăng nhập
        </Link>
      )}
    </header>
  );
}
