// Tổng hợp thông số 1 đội từ các trận của đội đó. Logic thuần, test độc lập.

type MatchStatsLite = {
  homeCorners: number | null;
  awayCorners: number | null;
  homeYellow: number | null;
  awayYellow: number | null;
  homeRed: number | null;
  awayRed: number | null;
  homeShots: number | null;
  awayShots: number | null;
  homePoss: number | null;
  awayPoss: number | null;
};

export type TeamStatMatch = {
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  stats: MatchStatsLite | null;
};

export type TeamStats = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  cleanSheets: number;
  shots: number;
  corners: number;
  yellow: number;
  red: number;
  avgPoss: number | null; // % kiểm soát bóng trung bình
};

/** Gộp thông số đội (chỉ trận FINISHED có tỉ số), lấy đúng cột nhà/khách theo vai trò của đội. */
export function computeTeamStats(teamId: string, matches: TeamStatMatch[]): TeamStats {
  let played = 0,
    won = 0,
    drawn = 0,
    lost = 0,
    goalsFor = 0,
    goalsAgainst = 0,
    cleanSheets = 0,
    shots = 0,
    corners = 0,
    yellow = 0,
    red = 0,
    possSum = 0,
    possCount = 0;

  for (const mt of matches) {
    const isHome = mt.homeTeamId === teamId;
    const isAway = mt.awayTeamId === teamId;
    if (mt.status !== "FINISHED" || mt.homeScore == null || mt.awayScore == null || (!isHome && !isAway)) {
      continue;
    }

    const gf = isHome ? mt.homeScore : mt.awayScore;
    const ga = isHome ? mt.awayScore : mt.homeScore;
    played++;
    goalsFor += gf;
    goalsAgainst += ga;
    if (gf > ga) won++;
    else if (gf < ga) lost++;
    else drawn++;
    if (ga === 0) cleanSheets++;

    const st = mt.stats;
    if (st) {
      const pick = (h: number | null, a: number | null) => (isHome ? h : a);
      shots += pick(st.homeShots, st.awayShots) ?? 0;
      corners += pick(st.homeCorners, st.awayCorners) ?? 0;
      yellow += pick(st.homeYellow, st.awayYellow) ?? 0;
      red += pick(st.homeRed, st.awayRed) ?? 0;
      const poss = pick(st.homePoss, st.awayPoss);
      if (poss != null) {
        possSum += poss;
        possCount++;
      }
    }
  }

  return {
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    cleanSheets,
    shots,
    corners,
    yellow,
    red,
    avgPoss: possCount ? Math.round(possSum / possCount) : null,
  };
}
