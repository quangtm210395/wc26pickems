"use client";
import { useTransition } from "react";
import { makePick } from "@/app/(tabs)/pickems/actions";
import type { PickChoice } from "@prisma/client";

interface PickButtonsProps {
  matchId: string;
  stage: string;
  current: PickChoice | null;
  homeLabel: string;
  awayLabel: string;
}

export function PickButtons({ matchId, stage, current, homeLabel, awayLabel }: PickButtonsProps) {
  const [isPending, startTransition] = useTransition();

  const isKnockout = stage !== "GROUP";
  const choices: { value: PickChoice; label: string }[] = isKnockout
    ? [
        { value: "HOME", label: homeLabel },
        { value: "AWAY", label: awayLabel },
      ]
    : [
        { value: "HOME", label: homeLabel },
        { value: "DRAW", label: "Hòa" },
        { value: "AWAY", label: awayLabel },
      ];

  function handlePick(choice: PickChoice) {
    startTransition(async () => {
      try {
        await makePick(matchId, choice);
      } catch {
        // Silent fail — revalidation will show updated state
      }
    });
  }

  return (
    <div className="flex gap-1.5 pt-2">
      {choices.map(({ value, label }) => {
        const isSelected = current === value;
        return (
          <button
            key={value}
            onClick={() => handlePick(value)}
            disabled={isPending}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-xl border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_14px_-6px_rgba(231,180,58,0.8)]"
                : "border-border bg-secondary/40 text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {isPending && isSelected ? (
              <span className="animate-pulse">...</span>
            ) : (
              label
            )}
          </button>
        );
      })}
    </div>
  );
}
