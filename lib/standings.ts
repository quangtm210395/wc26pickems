// Bảng xếp hạng vòng bảng — tính từ kết quả các trận. Logic thuần, test độc lập.

type TeamLite = { id: string; name: string; flag: string | null };

export type StandingMatch = {
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamLite | null;
  awayTeam: TeamLite | null;
};

export type StandingRow = {
  teamId: string;
  name: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // bàn thắng
  ga: number; // bàn thua
  gd: number; // hiệu số
  points: number;
};

/**
 * Bảng xếp hạng của 1 bảng đấu từ danh sách trận (đội suy ra từ chính các trận đó).
 * Đội chưa đá vẫn xuất hiện (chỉ số 0). Chỉ trận FINISHED có tỉ số mới tính.
 * Xếp: điểm → hiệu số → bàn thắng → tên (cho ổn định).
 */
export function computeGroupStandings(matches: StandingMatch[]): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  const ensure = (t: TeamLite): StandingRow => {
    let r = rows.get(t.id);
    if (!r) {
      r = {
        teamId: t.id,
        name: t.name,
        flag: t.flag,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      };
      rows.set(t.id, r);
    }
    return r;
  };

  for (const mt of matches) {
    if (mt.homeTeam) ensure(mt.homeTeam);
    if (mt.awayTeam) ensure(mt.awayTeam);

    if (
      mt.status !== "FINISHED" ||
      mt.homeScore == null ||
      mt.awayScore == null ||
      !mt.homeTeam ||
      !mt.awayTeam
    ) {
      continue;
    }

    const h = ensure(mt.homeTeam);
    const a = ensure(mt.awayTeam);
    h.played++;
    a.played++;
    h.gf += mt.homeScore;
    h.ga += mt.awayScore;
    a.gf += mt.awayScore;
    a.ga += mt.homeScore;

    if (mt.homeScore > mt.awayScore) {
      h.won++;
      h.points += 3;
      a.lost++;
    } else if (mt.homeScore < mt.awayScore) {
      a.won++;
      a.points += 3;
      h.lost++;
    } else {
      h.drawn++;
      a.drawn++;
      h.points++;
      a.points++;
    }
  }

  const arr = [...rows.values()];
  for (const r of arr) r.gd = r.gf - r.ga;
  arr.sort(
    (x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name),
  );
  return arr;
}
