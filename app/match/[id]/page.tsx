import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchById, vnDateLabel, vnTime } from "@/lib/matches";

function StatRow({
  label,
  home,
  away,
}: {
  label: string;
  home?: number | null;
  away?: number | null;
}) {
  if (home == null && away == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="w-10 text-left font-semibold tabular-nums">{home ?? "-"}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="w-10 text-right font-semibold tabular-nums">{away ?? "-"}</span>
    </div>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMatchById(id);
  if (!m) notFound();

  const done = m.status === "FINISHED";
  const live = m.status === "LIVE";
  const s = m.stats;

  return (
    <div className="space-y-5">
      <Link href="/lich" className="text-xs text-muted-foreground">
        ← Lịch thi đấu
      </Link>

      <div className="text-center text-xs text-muted-foreground">
        {m.groupName ? `Bảng ${m.groupName}` : m.stage} · {vnDateLabel(m.kickoff)} · {vnTime(m.kickoff)}
      </div>

      <div className="flex items-center justify-around gap-2">
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-4xl">{m.homeTeam?.flag ?? "🏳️"}</span>
          <span className="text-center text-sm font-medium">{m.homeTeam?.name ?? "TBD"}</span>
        </div>
        <div className="px-2 text-center">
          {done || live ? (
            <div className="text-3xl font-bold tabular-nums">
              {m.homeScore} - {m.awayScore}
            </div>
          ) : (
            <div className="text-2xl font-bold tabular-nums">{vnTime(m.kickoff)}</div>
          )}
          <div className={`text-[11px] uppercase ${live ? "font-semibold text-red-500" : "text-muted-foreground"}`}>
            {live ? "● Live" : done ? "Kết thúc" : "Sắp diễn ra"}
          </div>
          {m.homePens != null && (
            <div className="text-[11px] text-muted-foreground">
              pen {m.homePens}-{m.awayPens}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <span className="text-4xl">{m.awayTeam?.flag ?? "🏳️"}</span>
          <span className="text-center text-sm font-medium">{m.awayTeam?.name ?? "TBD"}</span>
        </div>
      </div>

      {m.venue && <p className="text-center text-xs text-muted-foreground">🏟️ {m.venue}</p>}

      {s && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            Thông số trận đấu
          </h2>
          <StatRow label="Sút" home={s.homeShots} away={s.awayShots} />
          <StatRow label="Phạt góc" home={s.homeCorners} away={s.awayCorners} />
          <StatRow label="Thẻ vàng" home={s.homeYellow} away={s.awayYellow} />
          <StatRow label="Thẻ đỏ" home={s.homeRed} away={s.awayRed} />
          <StatRow label="Kiểm soát %" home={s.homePoss} away={s.awayPoss} />
        </div>
      )}

      {m.preview && (
        <div className="rounded-lg border p-3">
          <h2 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Trước trận</h2>
          <p className="text-sm leading-relaxed">{m.preview}</p>
        </div>
      )}

      {!done && !s && (
        <p className="text-center text-xs text-muted-foreground">
          Thông số sẽ cập nhật sau khi trận kết thúc.
        </p>
      )}
    </div>
  );
}
