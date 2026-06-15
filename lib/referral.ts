import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import { randomBytes } from "crypto";

export const REFERRER_BONUS = 500; // người mời nhận
export const REFERRED_BONUS = 300; // người mới (qua link) nhận, ngoài welcome
const REFERRAL_WINDOW_MS = 60 * 60 * 1000; // chỉ tính nếu account vừa tạo < 1h (chống tự bấm)

function genCode(): string {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase()
    .slice(0, 6);
}

/** Lấy mã giới thiệu của user (tạo nếu chưa có). Idempotent. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (u?.referralCode) return u.referralCode;
  for (let i = 0; i < 8; i++) {
    const code = genCode();
    if (code.length < 4) continue;
    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // trùng mã (unique) → thử lại
    }
  }
  throw new Error("Không tạo được mã giới thiệu");
}

export async function getReferralCount(userId: string): Promise<number> {
  return prisma.user.count({ where: { referredById: userId } });
}

/**
 * Liên kết referral cho user MỚI + thưởng cả 2 bên. Idempotent + chống gian lận:
 * chỉ tính nếu user chưa có người mời VÀ account vừa tạo trong 1h VÀ mã khác mã của chính mình.
 */
export async function claimReferral(
  userId: string,
  code: string,
): Promise<{ claimed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referredById: true, createdAt: true, referralCode: true },
  });
  if (!user) return { claimed: false, reason: "no user" };
  if (user.referredById) return { claimed: false, reason: "đã có người mời" };
  if (Date.now() - user.createdAt.getTime() > REFERRAL_WINDOW_MS) {
    return { claimed: false, reason: "account không còn mới" };
  }
  if (user.referralCode && user.referralCode === code) {
    return { claimed: false, reason: "không tự mời mình" };
  }

  const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } });
  if (!referrer || referrer.id === userId) return { claimed: false, reason: "mã không hợp lệ" };

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.user.findUnique({ where: { id: userId }, select: { referredById: true } });
    if (fresh?.referredById) return; // race: đã claim
    await tx.user.update({ where: { id: userId }, data: { referredById: referrer.id } });
    await credit(tx, {
      userId: referrer.id,
      type: "REFERRAL",
      amount: REFERRER_BONUS,
      refType: "referral",
      refId: userId,
      note: "Mời được bạn mới",
    });
    await credit(tx, {
      userId,
      type: "REFERRED",
      amount: REFERRED_BONUS,
      refType: "referral",
      refId: referrer.id,
      note: "Thưởng đăng ký qua lời mời",
    });
  });
  return { claimed: true };
}
