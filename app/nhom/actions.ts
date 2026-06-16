"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createLeague, joinLeague, leaveLeague } from "@/lib/leagues";

export async function createLeagueAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/nhom?error=" + encodeURIComponent("Nhập tên nhóm nhé"));
  const league = await createLeague(session.user.id, name);
  redirect(`/nhom/${league.code}`);
}

export async function joinByCodeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const code = String(formData.get("code") ?? "");
  const res = await joinLeague(session.user.id, code);
  if (!res.ok) redirect("/nhom?error=" + encodeURIComponent(res.reason ?? "Lỗi"));
  redirect(`/nhom/${res.code}`);
}

// Bound với code khi render (form action={joinThisLeagueAction.bind(null, code)})
export async function joinThisLeagueAction(code: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login`);
  await joinLeague(session.user.id, code);
  revalidatePath(`/nhom/${code}`);
}

export async function leaveLeagueAction(leagueId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await leaveLeague(session.user.id, leagueId);
  redirect("/nhom");
}
