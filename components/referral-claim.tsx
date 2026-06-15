"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { claimReferralAction } from "@/app/referral/actions";

/** Mount khi user đã đăng nhập → claim referral từ cookie (nếu có). Idempotent. */
export function ReferralClaim() {
  const ran = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    claimReferralAction()
      .then((r) => {
        if (r?.claimed) router.refresh(); // cập nhật số dư
      })
      .catch(() => {});
  }, [router]);
  return null;
}
