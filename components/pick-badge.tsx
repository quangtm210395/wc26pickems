import type { Pick, PickChoice } from "@prisma/client";

export const PICK_CHOICE_LABEL: Record<PickChoice, string> = {
  HOME: "Nhà",
  DRAW: "Hòa",
  AWAY: "Khách",
};

/** Badge dự đoán pickems (1x2) — dùng ở trang Pickems và chi tiết trận. */
export function PickBadge({ pick, points }: { pick: Pick | undefined; points?: number }) {
  if (!pick) {
    return (
      <span className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground">Không dự đoán</span>
    );
  }
  const choice = PICK_CHOICE_LABEL[pick.choice];
  if (pick.status === "WON") {
    return (
      <span className="flex items-center gap-1 rounded-md border border-accent/40 bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
        {choice} · WON +{points ?? pick.points}đ
      </span>
    );
  }
  if (pick.status === "LOST") {
    return (
      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
        {choice} · Thua
      </span>
    );
  }
  return (
    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
      {choice} · Đang chờ
    </span>
  );
}
