"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { placeBet, cancelBet } from "@/lib/betting";

export async function placeBetAction(marketId: string, selectionKey: string, stake: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  await placeBet(session.user.id, marketId, selectionKey, stake);
  revalidatePath("/keo");
  revalidatePath("/match/[id]", "page"); // cập nhật "kèo của tôi" khi đặt từ trang chi tiết trận
}

export async function cancelBetAction(betId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  await cancelBet(session.user.id, betId);
  revalidatePath("/keo");
  revalidatePath("/vi");
  revalidatePath("/match/[id]", "page");
}
