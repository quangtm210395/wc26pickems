"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  claimDrip,
  claimShare,
  claimAd,
  borrow,
  repayLoan,
  type ClaimResult,
} from "@/lib/wallet";
import { checkIn } from "@/lib/checkin";

export async function checkInAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await checkIn(session.user.id);
  revalidatePath("/vi");
  return result;
}

export async function claimDripAction(): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await claimDrip(session.user.id);
  revalidatePath("/vi");
  return result;
}

export async function claimShareAction(): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await claimShare(session.user.id);
  revalidatePath("/vi");
  return result;
}

export async function claimAdAction(): Promise<ClaimResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await claimAd(session.user.id);
  revalidatePath("/vi");
  return result;
}

export async function borrowAction(amount: number): Promise<{ ok: true; balance: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await borrow(session.user.id, amount);
  revalidatePath("/vi");
  return { ok: true, balance: result.balance };
}

export async function repayAction(): Promise<{ ok: true; repaid: number; remaining: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const result = await repayLoan(session.user.id);
  revalidatePath("/vi");
  return { ok: true, ...result };
}
