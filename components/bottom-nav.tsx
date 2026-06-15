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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/15 bg-background/90 shadow-[0_-1px_0_0_rgba(231,180,58,0.12)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 font-display text-[11px] uppercase tracking-wide transition-colors ${
                  active
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_8px_0_rgba(231,180,58,0.7)]" />
                )}
                <span
                  className={`text-lg leading-none transition-transform ${active ? "scale-110" : ""}`}
                >
                  {t.icon}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
