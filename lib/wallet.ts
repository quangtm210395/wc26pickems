import { prisma } from "@/lib/prisma";
import { credit } from "@/lib/economy";
import type { TxType } from "@prisma/client";

export const DRIP_AMOUNT = 200;
export const SHARE_AMOUNT = 200;
export const AD_AMOUNT = 100;
export const AD_MAX_PER_DAY = 3;
export const AD_COOLDOWN_MS = 60 * 60 * 1000;
export const LOAN_MAX = 1000;
export const LOAN_INTEREST_PCT = 10;

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Mốc 00:00 hôm nay theo giờ VN (trả về Date theo UTC). */
export function startOfVnDay(now: Date): Date {
  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - VN_OFFSET_MS);
}

/** Số phải trả khi vay (gốc + lãi). */
export function loanOutstanding(principal: number, interestPct = LOAN_INTEREST_PCT): number {
  return Math.round(principal * (1 + interestPct / 100));
}

async function countSince(userId: string, type: TxType, since: Date): Promise<number> {
  return prisma.walletTransaction.count({ where: { userId, type, createdAt: { gte: since } } });
}

export type ClaimResult = { claimed: boolean; amount: number; reason?: string; balance?: number };

/** Điểm hằng ngày: +200, 1 lần/ngày (theo ngày VN). */
export async function claimDrip(userId: string, now: Date = new Date()): Promise<ClaimResult> {
  if ((await countSince(userId, "DRIP", startOfVnDay(now))) > 0) {
    return { claimed: false, amount: 0, reason: "Đã nhận hôm nay" };
  }
  const balance = await credit(prisma, { userId, type: "DRIP", amount: DRIP_AMOUNT, note: "Điểm hằng ngày" });
  return { claimed: true, amount: DRIP_AMOUNT, balance };
}

/** Nạp qua chia sẻ MXH: +200, 1 lần/ngày. */
export async function claimShare(userId: string, now: Date = new Date()): Promise<ClaimResult> {
  if ((await countSince(userId, "SHARE", startOfVnDay(now))) > 0) {
    return { claimed: false, amount: 0, reason: "Đã nhận hôm nay" };
  }
  const balance = await credit(prisma, { userId, type: "SHARE", amount: SHARE_AMOUNT, note: "Chia sẻ MXH" });
  return { claimed: true, amount: SHARE_AMOUNT, balance };
}

/** Nạp qua xem quảng cáo (stub): +100, tối đa 3 lần/ngày, cooldown 1h. */
export async function claimAd(userId: string, now: Date = new Date()): Promise<ClaimResult> {
  if ((await countSince(userId, "AD", startOfVnDay(now))) >= AD_MAX_PER_DAY) {
    return { claimed: false, amount: 0, reason: "Hết lượt xem hôm nay" };
  }
  const last = await prisma.walletTransaction.findFirst({
    where: { userId, type: "AD" },
    orderBy: { createdAt: "desc" },
  });
  if (last && now.getTime() - last.createdAt.getTime() < AD_COOLDOWN_MS) {
    return { claimed: false, amount: 0, reason: "Chờ chút rồi xem tiếp" };
  }
  const balance = await credit(prisma, { userId, type: "AD", amount: AD_AMOUNT, note: "Xem quảng cáo" });
  return { claimed: true, amount: AD_AMOUNT, balance };
}

/** Vay điểm (tối đa 1.000đ, lãi 10%). Còn nợ ACTIVE thì không vay tiếp. */
export async function borrow(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    if (!Number.isInteger(amount) || amount <= 0 || amount > LOAN_MAX) {
      throw new Error(`Vay từ 1 đến ${LOAN_MAX}đ`);
    }
    const active = await tx.loan.findFirst({ where: { userId, status: "ACTIVE" } });
    if (active) throw new Error("Còn nợ chưa trả, không vay tiếp được");
    await tx.loan.create({
      data: {
        userId,
        principal: amount,
        interestPct: LOAN_INTEREST_PCT,
        outstanding: loanOutstanding(amount),
      },
    });
    const balance = await credit(tx, {
      userId,
      type: "LOAN",
      amount,
      refType: "loan",
      note: `Vay ${amount}đ (lãi ${LOAN_INTEREST_PCT}%)`,
    });
    return { balance };
  });
}

/** Trả nợ: trừ tối đa có thể từ số dư vào khoản nợ ACTIVE. */
export async function repayLoan(userId: string) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({ where: { userId, status: "ACTIVE" } });
    if (!loan) return { repaid: 0, remaining: 0 };
    const user = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
    const pay = Math.min(user?.balance ?? 0, loan.outstanding);
    if (pay <= 0) throw new Error("Số dư không đủ để trả nợ");
    await credit(tx, { userId, type: "REPAY", amount: -pay, refType: "loan", refId: loan.id, note: "Trả nợ" });
    const remaining = loan.outstanding - pay;
    await tx.loan.update({
      where: { id: loan.id },
      data: { outstanding: remaining, status: remaining <= 0 ? "REPAID" : "ACTIVE" },
    });
    return { repaid: pay, remaining };
  });
}

export async function getActiveLoan(userId: string) {
  return prisma.loan.findFirst({ where: { userId, status: "ACTIVE" } });
}
