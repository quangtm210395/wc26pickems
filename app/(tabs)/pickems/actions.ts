"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PickChoice } from "@prisma/client";

export async function makePick(matchId: string, choice: PickChoice) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Chưa đăng nhập");
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.status !== "SCHEDULED" || match.kickoff <= new Date()) throw new Error("Đã khóa dự đoán");
  if (match.stage === "GROUP" ? false : choice === "DRAW") throw new Error("Knock-out không có kèo hòa");
  await prisma.pick.upsert({
    where: { userId_matchId: { userId: session.user.id, matchId } },
    create: { userId: session.user.id, matchId, choice },
    update: { choice },
  });
  revalidatePath("/pickems");
}
