"use client";

import { useTransition, useState } from "react";
import { adjustBalance } from "@/app/admin/actions";

interface AdminBalanceFormProps {
  userId: string;
  userName: string | null;
  balance: number;
}

export function AdminBalanceForm({ userId, userName, balance }: AdminBalanceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = parseInt(fd.get("amount") as string, 10);
    const note = (fd.get("note") as string) || "";

    if (isNaN(amount) || amount === 0) {
      setResult("Lỗi: Số điểm không được trống hoặc bằng 0.");
      return;
    }

    startTransition(async () => {
      try {
        await adjustBalance(userId, amount, note);
        setResult(`Đã cập nhật: ${amount > 0 ? "+" : ""}${amount.toLocaleString("vi-VN")}đ`);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        setResult(`Lỗi: ${err instanceof Error ? err.message : "Không xác định"}`);
      }
    });
  }

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{userName ?? "Ẩn danh"}</span>
        <span className="text-sm font-bold tabular-nums">{balance.toLocaleString("vi-VN")}đ</span>
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1">
          <input
            name="amount"
            type="number"
            placeholder="±điểm (vd: 500 hoặc -200)"
            required
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex-1">
          <input
            name="note"
            type="text"
            placeholder="Ghi chú (tuỳ chọn)"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[36px] shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "…" : "Cập nhật"}
        </button>
      </form>
      {result && (
        <p
          className={`mt-1.5 rounded px-2 py-1 text-xs ${
            result.startsWith("Lỗi")
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          }`}
        >
          {result}
        </p>
      )}
    </div>
  );
}
