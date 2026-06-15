import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  if (await auth()) redirect("/lich");

  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <div className="space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-xl font-bold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vào chơi Đường Đến Ngai Vàng World Cup 2026
        </p>
      </div>

      {googleEnabled && (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/lich" });
          }}
        >
          <Button className="w-full" type="submit">
            Tiếp tục với Google
          </Button>
        </form>
      )}

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("resend", formData);
        }}
        className="space-y-3"
      >
        <input type="hidden" name="redirectTo" value="/lich" />
        <input
          name="email"
          type="email"
          required
          placeholder="email@cua-ban.com"
          className="h-11 w-full rounded-md border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <Button variant="secondary" className="w-full" type="submit">
          Gửi link đăng nhập qua email
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Điểm ảo, chơi cho vui — không tiền thật.
      </p>
    </div>
  );
}
