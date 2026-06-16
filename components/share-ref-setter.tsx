"use client";

import { useEffect, useRef } from "react";
import { setShareRef } from "@/app/referral/actions";

// Khách mở link share BXH → ghi mã mời của người chia sẻ vào cookie (1 lần).
export function ShareRefSetter({ code }: { code: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !code) return;
    done.current = true;
    setShareRef(code).catch(() => {});
  }, [code]);
  return null;
}
