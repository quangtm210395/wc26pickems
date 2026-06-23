import Link from "next/link";
import {
  getAllMatches,
  getKnockoutMatches,
  groupByDay,
  groupByGroup,
  groupByStage,
  selectPinnedMatches,
  vnDateKey,
  vnDateLabel,
} from "@/lib/matches";
import { MatchCard } from "@/components/match-card";
import { StandingsTable } from "@/components/standings-table";
import { computeGroupStandings } from "@/lib/standings";

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
      <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-0.5 text-xs">
        {CHIPS.map(({ view, label }) => (
          <Link
            key={view}
            href={`/lich?view=${view}`}
            className={`inline-block min-h-[44px] min-w-[44px] content-center rounded-lg px-3 py-1.5 text-center font-display font-medium uppercase tracking-wide transition-colors ${
              active === view
                ? "bg-primary text-primary-foreground shadow-[0_2px_12px_-4px_rgba(231,180,58,0.7)]"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
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
          <h2 className="sticky top-14 z-10 flex items-center gap-2 bg-background/90 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground/80 backdrop-blur">
            <span className="h-3.5 w-0.5 rounded-full bg-primary" />
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
          <h3 className="sticky top-14 z-10 flex items-center gap-2 bg-background/90 py-1.5 font-display text-sm font-semibold uppercase capitalize tracking-wide text-foreground/80 backdrop-blur">
            <span className="h-3.5 w-0.5 rounded-full bg-primary" />
            {month.monthLabel}
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {month.days.map(({ key, day, count }) => (
              <Link
                key={key}
                href={`/lich?view=day`}
                className="flex min-h-[56px] flex-col items-center justify-center rounded-xl border border-border bg-card p-2 text-center transition-colors hover:border-primary/40 active:bg-primary/5"
              >
                <span className="font-display text-lg font-bold leading-none tabular-nums">{day}</span>
                <span className="mt-1 flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 font-display text-[10px] font-semibold leading-none text-primary-foreground">
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex shrink-0 items-center gap-2 text-xl font-bold uppercase tracking-tight">
          <span className="h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_0_rgba(231,180,58,0.6)]" />
          Lịch
        </h1>
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
  const pinned = selectPinnedMatches(matches, new Date());
  const sections = groupByDay(matches).map((d) => ({
    id: d.key,
    title: d.label,
    matches: d.matches,
  }));
  return (
    <div className="space-y-5">
      {pinned.length > 0 && (
        <section className="space-y-2">
          <h2 className="sticky top-14 z-10 flex items-center gap-2 bg-background/90 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground/80 backdrop-blur">
            <span className="h-3.5 w-0.5 rounded-full bg-primary" />
            🔥 Tâm điểm
          </h2>
          <div className="space-y-2">
            {pinned.map((m) => (
              <MatchCard key={`pin-${m.id}`} match={m} />
            ))}
          </div>
        </section>
      )}
      <SectionList sections={sections} />
    </div>
  );
}

async function GroupView() {
  const matches = await getAllMatches();
  const groupMatches = matches.filter((m) => m.stage === "GROUP");
  if (groupMatches.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có trận vòng bảng nào.</p>;
  }
  const groups = groupByGroup(groupMatches);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.name} className="space-y-2">
          <h2 className="sticky top-14 z-10 flex items-center gap-2 bg-background/90 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-foreground/80 backdrop-blur">
            <span className="h-3.5 w-0.5 rounded-full bg-primary" />
            Bảng {g.name}
          </h2>
          <StandingsTable rows={computeGroupStandings(g.matches)} />
          <div className="space-y-2 pt-1">
            {g.matches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
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
