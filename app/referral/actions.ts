"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { claimReferral } from "@/lib/referral";

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
