import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  if (await auth()) redirect("/lich");

  return (
    <div className="space-y-6 pt-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-3xl shadow-[0_0_28px_-6px_rgba(231,180,58,0.6)]">
          👑
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-primary">
          Đường Đến Ngai Vàng
        </h1>
        <p className="mt-0.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          World Cup 2026
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Dự đoán &amp; soi kèo cùng anh em — leo lên ngôi vương.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_0_rgba(231,180,58,0.08)_inset]">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/lich" });
          }}
        >
          <Button className="h-11 w-full" type="submit">
            Tiếp tục với Google
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">
          Đăng nhập nhanh bằng Google, vào chơi liền.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Điểm ảo, chơi cho vui — không tiền thật.
      </p>
    </div>
  );
}
