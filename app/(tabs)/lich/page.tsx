import Link from "next/link";
import {
  getAllMatches,
  getKnockoutMatches,
  groupByDay,
  groupByGroup,
  groupByStage,
  vnDateKey,
  vnDateLabel,
} from "@/lib/matches";
import { MatchCard } from "@/components/match-card";

// ─── Chip nav ───────────────────────────────────────────────────────────────

const CHIPS: { view: string; label: string }[] = [
  { view: "day", label: "Ngày" },
  { view: "group", label: "Bảng" },
  { view: "bracket", label: "Nhánh" },
  { view: "calendar", label: "Lịch" },
];

function ChipNav({ active }: { active: string }) {
  return (
    <div className="overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-md border p-0.5 text-xs">
        {CHIPS.map(({ view, label }) => (
          <Link
            key={view}
            href={`/lich?view=${view}`}
            className={`inline-block min-h-[44px] min-w-[44px] content-center rounded px-3 py-1.5 text-center transition-colors ${
              active === view
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Shared section list ─────────────────────────────────────────────────────

function SectionList({
  sections,
}: {
  sections: { id: string; title: string; matches: Parameters<typeof MatchCard>[0]["match"][] }[];
}) {
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} className="space-y-2">
          <h2 className="sticky top-14 z-10 bg-background/95 py-1 text-sm font-semibold text-muted-foreground backdrop-blur">
            {s.title}
          </h2>
          <div className="space-y-2">
            {s.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

// ─── Calendar view ───────────────────────────────────────────────────────────

function CalendarView({
  days,
}: {
  days: { key: string; label: string; count: number }[];
}) {
  // Build a full month grid from first to last match day
  // We'll just render a vertical compact list of day cells (simple, mobile-first)
  // Group by month
  type MonthBucket = { monthLabel: string; days: { key: string; day: number; count: number }[] };
  const months: MonthBucket[] = [];
  let currentMonth = "";
  for (const d of days) {
    const [year, month, day] = d.key.split("-").map(Number);
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const monthLabel = new Intl.DateTimeFormat("vi-VN", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, 1));
    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      months.push({ monthLabel, days: [] });
    }
    months[months.length - 1].days.push({ key: d.key, day, count: d.count });
  }

  return (
    <div className="space-y-6">
      {months.map((month) => (
        <div key={month.monthLabel} className="space-y-2">
          <h3 className="sticky top-14 z-10 bg-background/95 py-1 text-sm font-semibold capitalize text-muted-foreground backdrop-blur">
            {month.monthLabel}
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {month.days.map(({ key, day, count }) => (
              <Link
                key={key}
                href={`/lich?view=day`}
                className="flex min-h-[56px] flex-col items-center justify-center rounded-lg border bg-card p-2 text-center transition-colors active:bg-accent"
              >
                <span className="text-base font-bold tabular-nums">{day}</span>
                <span className="mt-0.5 flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LichPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode = ["day", "group", "bracket", "calendar"].includes(view ?? "")
    ? (view as string)
    : "day";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="shrink-0 text-lg font-semibold">Lịch thi đấu</h1>
        <ChipNav active={mode} />
      </div>

      {mode === "day" && <DayView />}
      {mode === "group" && <GroupView />}
      {mode === "bracket" && <BracketView />}
      {mode === "calendar" && <CalendarViewPage />}
    </div>
  );
}

// ─── View sub-components (async server components) ───────────────────────────

async function DayView() {
  const matches = await getAllMatches();
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận nào. Chạy `npm run db:seed`.</p>;
  }
  const sections = groupByDay(matches).map((d) => ({
    id: d.key,
    title: d.label,
    matches: d.matches,
  }));
  return <SectionList sections={sections} />;
}

async function GroupView() {
  const matches = await getAllMatches();
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  if (groupMatches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận vòng bảng nào.</p>;
  }
  const sections = groupByGroup(groupMatches).map((g) => ({
    id: g.name,
    title: `Bảng ${g.name}`,
    matches: g.matches,
  }));
  return <SectionList sections={sections} />;
}

async function BracketView() {
  const matches = await getKnockoutMatches();
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận knock-out nào.</p>;
  }
  const stages = groupByStage(matches);
  const sections = stages.map((s) => ({
    id: s.stage,
    title: s.label,
    matches: s.matches,
  }));
  return <SectionList sections={sections} />;
}

async function CalendarViewPage() {
  const matches = await getAllMatches();
  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận nào. Chạy `npm run db:seed`.</p>;
  }

  // Count matches per VN date
  const countMap = new Map<string, number>();
  const labelMap = new Map<string, string>();
  for (const m of matches) {
    const key = vnDateKey(m.kickoff);
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
    if (!labelMap.has(key)) labelMap.set(key, vnDateLabel(m.kickoff));
  }

  const days = [...countMap.keys()]
    .sort()
    .map((key) => ({ key, label: labelMap.get(key)!, count: countMap.get(key)! }));

  return <CalendarView days={days} />;
}
