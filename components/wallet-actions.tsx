"use client";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { claimDripAction, checkInAction, borrowAction, repayAction } from "@/app/vi/actions";
import type { ClaimResult } from "@/lib/wallet";
import type { CheckinState } from "@/lib/checkin";

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
            msg.startsWith("✓") ? "text-emerald-400" : "text-muted-foreground"
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
      </CardContent>
    </Card>
  );
}

// ─── Check-in streak card ────────────────────────────────────────────────────

export function CheckinCard({ streak, canCheckIn, nextStreakDay, nextReward }: CheckinState) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<{ streakDay: number; total: number; bonus: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleCheckIn() {
    startTransition(async () => {
      setErr(null);
      try {
        const res = await checkInAction();
        if (res.ok) {
          setDone({ streakDay: res.streakDay!, total: res.total!, bonus: res.bonus! });
        } else {
          setErr(res.reason ?? "Không thể check-in");
        }
      } catch (e) {
        setErr((e as Error).message ?? "Lỗi");
      }
    });
  }

  const shownStreak = done ? done.streakDay : streak;

  return (
    <Card className="ring-primary/15">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Check-in hằng ngày</span>
          <span className="font-display text-sm text-primary">🔥 {shownStreak} ngày</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pb-4">
        {done ? (
          <p className="text-sm text-emerald-400">
            ✓ Check-in ngày {done.streakDay}: +{fmt(done.total)}đ
            {done.bonus > 0 && ` (gồm thưởng mốc +${fmt(done.bonus)})`} 🎉
          </p>
        ) : canCheckIn ? (
          <>
            <Button className="min-h-[44px]" onClick={handleCheckIn} disabled={isPending}>
              {isPending ? (
                <span className="animate-pulse">Đang xử lý…</span>
              ) : (
                `🔥 Check-in nhận ${fmt(nextReward.total)}đ`
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Ngày thứ {nextStreakDay}
              {nextReward.growthPct > 0 && ` · +${nextReward.growthPct}% so với hôm qua`}
              {nextReward.bonus > 0 && ` · 🎁 thưởng mốc 7 ngày +${fmt(nextReward.bonus)}đ`}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            ✓ Đã check-in hôm nay. Quay lại mai (ngày {nextStreakDay}) nhận ~{fmt(nextReward.total)}đ
            — đừng để đứt chuỗi nhé! 🔥
          </p>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
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
              msg.startsWith("✓") ? "text-emerald-400" : "text-destructive"
            }`}
          >
            {msg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
