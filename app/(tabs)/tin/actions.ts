"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Chỉ admin mới có quyền thực hiện thao tác này.");
  }
}

export async function publishPost(postId: string): Promise<void> {
  await requireAdmin();
  await prisma.post.update({
    where: { id: postId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  revalidatePath("/tin");
}

export async function unpublishPost(postId: string): Promise<void> {
  await requireAdmin();
  await prisma.post.update({
    where: { id: postId },
    data: { status: "DRAFT", publishedAt: null },
  });
  revalidatePath("/tin");
}
