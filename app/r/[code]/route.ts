import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Mở link mời → lưu mã vào cookie rồi đưa tới trang đăng nhập.
// Sau khi đăng nhập, ReferralClaim sẽ đọc cookie và liên kết + thưởng.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/login", req.url));
  if (code && /^[a-z0-9]{4,12}$/i.test(code)) {
    res.cookies.set("ref", code.toLowerCase(), {
      httpOnly: true,
      maxAge: 7 * 24 * 3600,
      path: "/",
      sameSite: "lax",
    });
  }
  return res;
}
