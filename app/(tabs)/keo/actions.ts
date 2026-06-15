"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { placeBet } from "@/lib/betting";

export async function placeBetAction(marketId: string, selectionKey: string, stake: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  await placeBet(session.user.id, marketId, selectionKey, stake);
  revalidatePath("/keo");
}
