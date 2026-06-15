import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function AppHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-sm font-bold leading-tight">
        👑 Đường Đến Ngai Vàng
        <span className="block text-xs font-normal text-muted-foreground">World Cup 2026</span>
      </Link>
      {session?.user ? (
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-xs text-muted-foreground underline">Đăng xuất</button>
        </form>
      ) : (
        <Link href="/login" className="text-xs font-medium text-primary underline">
          Đăng nhập
        </Link>
      )}
    </header>
  );
}
