"use client";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  claimDripAction,
  claimShareAction,
  claimAdAction,
  borrowAction,
  repayAction,
} from "@/app/vi/actions";
import type { ClaimResult } from "@/lib/wallet";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ─── Single claim button with inline feedback ────────────────────────────────

function ClaimButton({
  label,
  action,
}: {
  label: string;
  action: () => Promise<ClaimResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const res = await action();
        if (res.claimed) {
          setMsg(`✓ +${fmt(res.amount)}đ`);
        } else {
          setMsg(res.reason ?? "Không thể nhận");
        }
      } catch (e) {
        setMsg((e as Error).message ?? "Lỗi");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="min-h-[44px] flex-1 text-left justify-start"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? <span className="animate-pulse">Đang xử lý…</span> : label}
      </Button>
      {msg && (
        <span
          className={`text-xs ${
            msg.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          }`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}

// ─── Nạp điểm card ────────────────────────────────────────────────────────────

export function NapDiemCard() {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Nạp điểm</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4">
        <ClaimButton label="🎁 Nhận 200đ hôm nay" action={claimDripAction} />
        <ClaimButton label="📣 Chia sẻ MXH +200đ" action={claimShareAction} />
        <ClaimButton label="📺 Xem quảng cáo +100đ" action={claimAdAction} />
      </CardContent>
    </Card>
  );
}

// ─── Vay điểm card ────────────────────────────────────────────────────────────

interface LoanCardProps {
  activeLoanOutstanding: number | null;
}

export function LoanCard({ activeLoanOutstanding }: LoanCardProps) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleBorrow(amount: number) {
    startTransition(async () => {
      try {
        await borrowAction(amount);
        setMsg(`✓ Vay ${fmt(amount)}đ thành công`);
      } catch (e) {
        setMsg((e as Error).message ?? "Lỗi");
      }
    });
  }

  function handleRepay() {
    startTransition(async () => {
      try {
        const res = await repayAction();
        if (res.remaining <= 0) {
          setMsg(`✓ Trả hết nợ (${fmt(res.repaid)}đ)`);
        } else {
          setMsg(`✓ Trả ${fmt(res.repaid)}đ, còn ${fmt(res.remaining)}đ`);
        }
      } catch (e) {
        setMsg((e as Error).message ?? "Lỗi");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-base">Vay điểm</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4">
        {activeLoanOutstanding !== null ? (
          <>
            <p className="text-sm text-muted-foreground">
              Đang nợ:{" "}
              <span className="font-semibold text-foreground">{fmt(activeLoanOutstanding)}đ</span>
            </p>
            <Button
              className="min-h-[44px]"
              onClick={handleRepay}
              disabled={isPending}
            >
              {isPending ? <span className="animate-pulse">Đang xử lý…</span> : "Trả nợ"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => handleBorrow(500)}
                disabled={isPending}
              >
                {isPending ? "…" : "Vay 500đ"}
              </Button>
              <Button
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => handleBorrow(1000)}
                disabled={isPending}
              >
                {isPending ? "…" : "Vay 1.000đ"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">lãi 10%, trả trước khi vay tiếp</p>
          </>
        )}
        {msg && (
          <p
            className={`text-xs ${
              msg.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-red-500"
            }`}
          >
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
