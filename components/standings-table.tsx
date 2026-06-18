import type { StandingRow } from "@/lib/standings";

/** Bảng xếp hạng 1 bảng đấu. Top 2 (đi tiếp) được tô số thứ tự xanh. */
export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 pl-2 pr-1 text-center font-medium">#</th>
            <th className="px-1 py-1.5 text-left font-medium">Đội</th>
            <th className="px-1 text-center font-medium">Tr</th>
            <th className="px-1 text-center font-medium">T</th>
            <th className="px-1 text-center font-medium">H</th>
            <th className="px-1 text-center font-medium">B</th>
            <th className="px-1 text-center font-medium">HS</th>
            <th className="py-1.5 pl-1 pr-2 text-center font-semibold text-foreground">Đ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId} className="border-b border-border/50 last:border-0">
              <td className="py-1.5 pl-2 pr-1 text-center">
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                    i < 2 ? "bg-emerald-500/20 text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-1">
                <div className="flex items-center gap-1.5">
                  <span>{r.flag ?? "🏳️"}</span>
                  <span className="max-w-[88px] truncate font-medium">{r.name}</span>
                </div>
              </td>
              <td className="px-1 text-center text-muted-foreground">{r.played}</td>
              <td className="px-1 text-center text-muted-foreground">{r.won}</td>
              <td className="px-1 text-center text-muted-foreground">{r.drawn}</td>
              <td className="px-1 text-center text-muted-foreground">{r.lost}</td>
              <td className="px-1 text-center text-muted-foreground">
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </td>
              <td className="pl-1 pr-2 text-center font-display font-bold text-foreground">
                {r.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
