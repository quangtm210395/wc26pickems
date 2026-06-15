import Link from "next/link";
import { getAllMatches, groupByDay, groupByGroup } from "@/lib/matches";
import { MatchCard } from "@/components/match-card";

export default async function LichPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const mode = view === "group" ? "group" : "day";
  const matches = await getAllMatches();

  const sections =
    mode === "day"
      ? groupByDay(matches).map((d) => ({ id: d.key, title: d.label, matches: d.matches }))
      : groupByGroup(matches).map((g) => ({ id: g.name, title: `Bảng ${g.name}`, matches: g.matches }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Lịch thi đấu</h1>
        <div className="flex overflow-hidden rounded-md border text-xs">
          <Link
            href="/lich?view=day"
            className={`px-3 py-1.5 ${mode === "day" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Theo ngày
          </Link>
          <Link
            href="/lich?view=group"
            className={`px-3 py-1.5 ${mode === "group" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            Theo bảng
          </Link>
        </div>
      </div>

      {matches.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có trận nào. Chạy `npm run db:seed`.</p>
      )}

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
    </div>
  );
}
