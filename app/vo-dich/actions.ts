"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { placeChampionBet } from "@/lib/champion";

export async function placeChampionBetAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const teamId = String(formData.get("teamId") ?? "");
  const stake = parseInt(String(formData.get("stake") ?? ""), 10);
  const res = await placeChampionBet(session.user.id, teamId, stake);
  if (!res.ok) redirect("/vo-dich?error=" + encodeURIComponent(res.reason ?? "Lỗi"));
  redirect("/vo-dich?ok=1");
}
