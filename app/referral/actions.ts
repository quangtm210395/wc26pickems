"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { claimReferral } from "@/lib/referral";

/** Khách chưa đăng nhập mở link share BXH → lưu mã mời của người chia sẻ vào cookie,
 *  để khi họ đăng ký mới thì vẫn tính referral cho người chia sẻ. */
export async function setShareRef(code: string) {
  const session = await auth();
  if (session?.user?.id) return; // đã đăng nhập rồi, không cần
  const jar = await cookies();
  if (jar.get("ref")) return; // đã có mã mời (vd từ link /r/) → không ghi đè
  if (/^[a-z0-9]{4,12}$/i.test(code)) {
    jar.set("ref", code.toLowerCase(), {
      httpOnly: true,
      maxAge: 7 * 24 * 3600,
      path: "/",
      sameSite: "lax",
    });
  }
}

/** Đọc cookie 'ref' + user hiện tại → liên kết referral (1 lần). Gọi sau khi đăng nhập. */
export async function claimReferralAction() {
  const session = await auth();
  if (!session?.user?.id) return { claimed: false };
  const jar = await cookies();
  const ref = jar.get("ref")?.value;
  if (!ref) return { claimed: false };
  const result = await claimReferral(session.user.id, ref);
  jar.delete("ref"); // dùng 1 lần
  return result;
}
