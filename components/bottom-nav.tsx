"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/lich", label: "Lịch", icon: "📅" },
  { href: "/pickems", label: "Pickems", icon: "🎯" },
  { href: "/keo", label: "Kèo", icon: "💰" },
  { href: "/bxh", label: "BXH", icon: "🏆" },
  { href: "/tin", label: "Tin", icon: "📰" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "font-semibold text-primary" : "text-muted-foreground"
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
