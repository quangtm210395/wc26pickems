"use client";

import { useTransition, useState } from "react";
import { publishPost } from "@/app/(tabs)/tin/actions";

interface AdminPublishButtonProps {
  postId: string;
  title: string;
}

export function AdminPublishButton({ postId, title }: AdminPublishButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      try {
        await publishPost(postId);
        setDone(true);
      } catch {
        // silently ignore
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
      <span className="flex-1 truncate text-sm">{title}</span>
      {done ? (
        <span className="shrink-0 text-xs text-green-600 dark:text-green-400">✓ Đã đăng</span>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="min-h-[36px] shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "…" : "Đăng"}
        </button>
      )}
    </div>
  );
}
