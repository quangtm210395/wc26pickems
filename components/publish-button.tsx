"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { publishPost } from "@/app/(tabs)/tin/actions";

export function PublishButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="default"
      disabled={isPending}
      onClick={() => {
        startTransition(() => publishPost(postId));
      }}
      className="min-h-[44px] text-xs"
    >
      {isPending ? "Đang đăng…" : "Đăng"}
    </Button>
  );
}
