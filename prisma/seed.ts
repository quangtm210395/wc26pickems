/**
 * prisma/seed.ts — Seed dữ liệu World Cup 2026
 *
 * Chạy: npm run db:seed  (hoặc: node_modules/.bin/prisma db seed)
 * Idempotent: upsert theo externalId / code / name — chạy nhiều lần không tạo duplicate.
 *
 * Nội dung:
 *   - 12 bảng A–L, mỗi bảng 4 đội = 48 đội
 *   - 72 trận vòng bảng (round-robin mỗi bảng 6 trận, 3 lượt)
 *   - Trận trước 2026-06-15: FINISHED + điểm số + MatchStats
 *   - Trận từ 2026-06-15 trở đi: SCHEDULED + preview tiếng Việt
 */

import { PrismaClient, MatchStatus, Stage, MarketType } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Hằng số ───────────────────────────────────────────────────────────────

const TODAY = new Date("2026-06-15T00:00:00Z");

const VENUES = [
  "MetLife Stadium, New York",
  "SoFi Stadium, Los Angeles",
  "Estadio Azteca, Mexico City",
  "BC Place, Vancouver",
  "AT&T Stadium, Dallas",
  "Mercedes-Benz Stadium, Atlanta",
];

// ─── Dữ liệu các đội theo bảng ─────────────────────────────────────────────
// 48 đội, mỗi đội có code FIFA duy nhất, phân bổ hợp lý theo châu lục.
// Đây là dữ liệu demo — admin có thể chỉnh sau.

interface TeamDef {
  name: string;
  code: string; // phải unique toàn bộ 48 đội
  flag: string;
}

const GROUPS: Record<string, TeamDef[]> = {
  // CONCACAF host group A — Brazil đầu bảng
  A: [
    { name: "Brazil", code: "BRA", flag: "🇧🇷" },
    { name: "Croatia", code: "CRO", flag: "🇭🇷" },
    { name: "Morocco", code: "MAR", flag: "🇲🇦" },
    { name: "Canada", code: "CAN", flag: "🇨🇦" },
  ],
  B: [
    { name: "France", code: "FRA", flag: "🇫🇷" },
    { name: "Netherlands", code: "NED", flag: "🇳🇱" },
    { name: "Senegal", code: "SEN", flag: "🇸🇳" },
    { name: "Ecuador", code: "ECU", flag: "🇪🇨" },
  ],
  C: [
    { name: "Argentina", code: "ARG", flag: "🇦🇷" },
    { name: "Poland", code: "POL", flag: "🇵🇱" },
    { name: "Mexico", code: "MEX", flag: "🇲🇽" },
    { name: "Saudi Arabia", code: "KSA", flag: "🇸🇦" },
  ],
  D: [
    { name: "England", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Portugal", code: "POR", flag: "🇵🇹" },
    { name: "Ghana", code: "GHA", flag: "🇬🇭" },
    { name: "Costa Rica", code: "CRC", flag: "🇨🇷" },
  ],
  E: [
    { name: "Spain", code: "ESP", flag: "🇪🇸" },
    { name: "Germany", code: "GER", flag: "🇩🇪" },
    { name: "Japan", code: "JPN", flag: "🇯🇵" },
    { name: "Ivory Coast", code: "CIV", flag: "🇨🇮" },
  ],
  F: [
    { name: "Belgium", code: "BEL", flag: "🇧🇪" },
    { name: "Uruguay", code: "URU", flag: "🇺🇾" },
    { name: "South Korea", code: "KOR", flag: "🇰🇷" },
    { name: "Tunisia", code: "TUN", flag: "🇹🇳" },
  ],
  G: [
    { name: "USA", code: "USA", flag: "🇺🇸" },
    { name: "Denmark", code: "DEN", flag: "🇩🇰" },
    { name: "Cameroon", code: "CMR", flag: "🇨🇲" },
    { name: "Honduras", code: "HON", flag: "🇭🇳" },
  ],
  H: [
    { name: "Switzerland", code: "SUI", flag: "🇨🇭" },
    { name: "Colombia", code: "COL", flag: "🇨🇴" },
    { name: "Nigeria", code: "NGA", flag: "🇳🇬" },
    { name: "Chile", code: "CHI", flag: "🇨🇱" },
  ],
  I: [
    { name: "Italy", code: "ITA", flag: "🇮🇹" },
    { name: "Ukraine", code: "UKR", flag: "🇺🇦" },
    { name: "Egypt", code: "EGY", flag: "🇪🇬" },
    { name: "Panama", code: "PAN", flag: "🇵🇦" },
  ],
  J: [
    { name: "Iran", code: "IRN", flag: "🇮🇷" },
    { name: "Australia", code: "AUS", flag: "🇦🇺" },
    { name: "Serbia", code: "SRB", flag: "🇷🇸" },
    { name: "Bolivia", code: "BOL", flag: "🇧🇴" },
  ],
  K: [
    { name: "Qatar", code: "QAT", flag: "🇶🇦" },
    { name: "Wales", code: "WAL", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
    { name: "Algeria", code: "ALG", flag: "🇩🇿" },
    { name: "Peru", code: "PER", flag: "🇵🇪" },
  ],
  L: [
    { name: "Turkey", code: "TUR", flag: "🇹🇷" },
    { name: "Austria", code: "AUT", flag: "🇦🇹" },
    { name: "Mali", code: "MLI", flag: "🇲🇱" },
    { name: "Cuba", code: "CUB", flag: "🇨🇺" },
  ],
};

// ─── Lịch kickoff theo matchday ─────────────────────────────────────────────
// Matchday 1: 2026-06-11 → 2026-06-14 (trước TODAY → FINISHED)
// Matchday 2: 2026-06-15 → 2026-06-19 (bắt đầu TODAY → SCHEDULED)
// Matchday 3: 2026-06-22 → 2026-06-27 (sau TODAY → SCHEDULED)
//
// 12 bảng × 2 trận/lượt = 24 trận/lượt trải trên 4 ngày × 3 slot/ngày = 12 slot
// (nhóm 0-2 → ngày 1, nhóm 3-5 → ngày 2, nhóm 6-8 → ngày 3, nhóm 9-11 → ngày 4)

function getKickoff(groupIndex: number, matchday: number): Date {
  const mdBaseDay: Record<number, number> = { 1: 11, 2: 15, 3: 22 };
  const dayOffset = Math.floor(groupIndex / 3); // 0..3
  const slotInDay = groupIndex % 3; // 0..2
  const hours = [14, 17, 20]; // UTC
  const day = mdBaseDay[matchday] + dayOffset;
  return new Date(
    `2026-06-${String(day).padStart(2, "0")}T${String(hours[slotInDay]).padStart(2, "0")}:00:00Z`
  );
}

// ─── Hash đơn giản (deterministic, không dùng Math.random) ─────────────────

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
}

// ─── Điểm số deterministic ──────────────────────────────────────────────────

function getScore(externalId: string): { homeScore: number; awayScore: number } {
  return {
    homeScore: simpleHash(externalId + "hs") % 4, // 0..3
    awayScore: simpleHash(externalId + "as") % 4, // 0..3
  };
}

// ─── MatchStats deterministic ────────────────────────────────────────────────

function getStats(externalId: string) {
  const h = (key: string) => simpleHash(externalId + key);
  const homePoss = 35 + (h("poss") % 31); // 35..65
  return {
    homeCorners: 2 + (h("hc") % 8),   // 2..9
    awayCorners: 2 + (h("ac") % 8),   // 2..9
    homeYellow:  h("hy") % 5,          // 0..4
    awayYellow:  h("ay") % 5,          // 0..4
    homeRed:     h("hr") % 2,          // 0..1
    awayRed:     h("ar") % 2,          // 0..1
    homeShots:   5 + (h("hs2") % 14), // 5..18
    awayShots:   5 + (h("as2") % 14), // 5..18
    homePoss,
    awayPoss: 100 - homePoss,
  };
}

// ─── Round-robin: 3 lượt, 6 trận cho 4 đội ──────────────────────────────────
// Đội index 0..3 trong mỗi bảng
// Lượt 1 (matchday 1): [0v1, 2v3]
// Lượt 2 (matchday 2): [0v2, 1v3]
// Lượt 3 (matchday 3): [0v3, 1v2]

const ROUND_ROBIN: { home: number; away: number; matchday: number }[] = [
  { home: 0, away: 1, matchday: 1 },
  { home: 2, away: 3, matchday: 1 },
  { home: 0, away: 2, matchday: 2 },
  { home: 1, away: 3, matchday: 2 },
  { home: 0, away: 3, matchday: 3 },
  { home: 1, away: 2, matchday: 3 },
];

// ─── Preview tiếng Việt cho trận SCHEDULED ──────────────────────────────────

const PREVIEWS = [
  "Trận đấu hứa hẹn kịch tính, cả hai đội đều muốn giành trọn 3 điểm.",
  "Cuộc đối đầu không thể bỏ qua giữa hai đội có phong cách chơi trái ngược.",
  "Đây là trận cầu sống còn, kẻ thua có nguy cơ bị loại sớm.",
  "Hai đội cần điểm để tiến vào vòng knock-out.",
  "Ngôi sao nào sẽ tỏa sáng trong trận đấu nhiều kỳ vọng này?",
  "Phân tích chiến thuật: ai sẽ kiểm soát thế trận tốt hơn?",
  "Cuộc chiến giữa lối đá tấn công và hàng thủ vững chắc.",
  "Đội đầu bảng quyết tâm khẳng định vị thế trước đối thủ khó chơi.",
  "Một trong những trận hay nhất lượt này theo dự đoán của các chuyên gia.",
  "Trận đấu mà bất cứ kết quả nào cũng đều bất ngờ.",
];

function getPreview(externalId: string): string {
  return PREVIEWS[simpleHash(externalId + "prev") % PREVIEWS.length];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Bắt đầu seed World Cup 2026...");

  const groupLetters = Object.keys(GROUPS); // A..L, 12 bảng

  // 1. Upsert Groups
  console.log(`  → Upsert ${groupLetters.length} bảng...`);
  const groupIdMap: Record<string, string> = {};
  for (const letter of groupLetters) {
    const g = await prisma.group.upsert({
      where:  { name: letter },
      update: {},
      create: { name: letter },
    });
    groupIdMap[letter] = g.id;
  }

  // 2. Upsert Teams
  const totalTeams = groupLetters.reduce((s, l) => s + GROUPS[l].length, 0);
  console.log(`  → Upsert ${totalTeams} đội...`);
  const teamIdMap: Record<string, string> = {}; // code → id
  for (const [letter, teams] of Object.entries(GROUPS)) {
    for (const t of teams) {
      const team = await prisma.team.upsert({
        where:  { code: t.code },
        update: { name: t.name, flag: t.flag, groupId: groupIdMap[letter] },
        create: { name: t.name, code: t.code, flag: t.flag, groupId: groupIdMap[letter] },
      });
      teamIdMap[t.code] = team.id;
    }
  }

  // 3. Upsert Matches + MatchStats
  console.log(`  → Upsert 72 trận vòng bảng...`);
  let totalMatches = 0;
  let finished = 0;

  for (let gi = 0; gi < groupLetters.length; gi++) {
    const letter = groupLetters[gi];
    const teams  = GROUPS[letter];

    for (const { home: hi, away: ai, matchday } of ROUND_ROBIN) {
      const homeTeam = teams[hi];
      const awayTeam = teams[ai];
      const kickoff  = getKickoff(gi, matchday);
      const isFinished = kickoff < TODAY;

      const externalId = `seed-${letter}-md${matchday}-${homeTeam.code}-${awayTeam.code}`;
      const venueIdx   = simpleHash(externalId + "venue") % VENUES.length;

      // Dữ liệu trận
      const matchPayload: Parameters<typeof prisma.match.create>[0]["data"] = {
        stage:      Stage.GROUP,
        groupName:  letter,
        matchday,
        kickoff,
        status:     isFinished ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
        homeTeamId: teamIdMap[homeTeam.code],
        awayTeamId: teamIdMap[awayTeam.code],
        venue:      VENUES[venueIdx],
      };

      if (isFinished) {
        const { homeScore, awayScore } = getScore(externalId);
        matchPayload.homeScore = homeScore;
        matchPayload.awayScore = awayScore;
      } else {
        matchPayload.preview = getPreview(externalId);
      }

      const match = await prisma.match.upsert({
        where:  { externalId },
        update: matchPayload,
        create: { ...matchPayload, externalId },
      });

      // Tạo stats cho trận đã đấu
      if (isFinished) {
        await prisma.matchStats.upsert({
          where:  { matchId: match.id },
          update: getStats(externalId),
          create: { matchId: match.id, ...getStats(externalId) },
        });
        finished++;
      }

      totalMatches++;
    }
  }

  // 4. Upsert Knockout matches
  const knockoutCount = await seedKnockout();
  const grandTotal = totalMatches + knockoutCount;

  // 5. Seed betting markets for group-stage SCHEDULED matches
  const { marketsCreated, selectionsCreated, marketsSkipped } = await seedMarkets();

  console.log(`\n✅ Seed hoàn tất!`);
  console.log(`   Bảng:                 ${groupLetters.length}`);
  console.log(`   Đội:                  ${Object.keys(teamIdMap).length}`);
  console.log(`   Trận vòng bảng:       ${totalMatches}`);
  console.log(`   Trận knock-out:       ${knockoutCount}`);
  console.log(`   Tổng trận:            ${grandTotal}`);
  console.log(`   Đã đấu (FINISHED):    ${finished}`);
  console.log(`   Chưa đấu (SCHEDULED): ${totalMatches - finished + knockoutCount}`);
  console.log(`   Markets tạo mới:      ${marketsCreated}`);
  console.log(`   Selections tạo mới:   ${selectionsCreated}`);
  console.log(`   Markets bỏ qua:       ${marketsSkipped}`);
}

// ─── Knockout match definitions ─────────────────────────────────────────────

interface KnockoutDef {
  stage: Stage;
  bracketSlot: string;
  kickoff: Date;
}

function makeKnockoutMatches(): KnockoutDef[] {
  const matches: KnockoutDef[] = [];

  // R32: 16 matches, 2026-06-28 → 2026-07-03
  // Spread 16 matches over 6 days (days 0..5), ~2-3 per day, 3 slots per day
  const r32Kickoffs: Date[] = [];
  {
    const baseDay = new Date("2026-06-28T14:00:00Z");
    const slots = [14, 17, 20]; // UTC hours
    let slotIdx = 0;
    let dayIdx = 0;
    for (let i = 0; i < 16; i++) {
      const d = new Date(baseDay);
      d.setUTCDate(28 + dayIdx);
      d.setUTCHours(slots[slotIdx]);
      r32Kickoffs.push(new Date(d));
      slotIdx++;
      if (slotIdx >= 3) { slotIdx = 0; dayIdx++; }
    }
  }
  for (let i = 1; i <= 16; i++) {
    matches.push({ stage: Stage.R32, bracketSlot: `R32-${i}`, kickoff: r32Kickoffs[i - 1] });
  }

  // R16: 8 matches, 2026-07-04 → 2026-07-07
  const r16Kickoffs: Date[] = [];
  {
    const slots = [14, 20];
    let slotIdx = 0;
    let dayIdx = 0;
    for (let i = 0; i < 8; i++) {
      const d = new Date("2026-07-04T00:00:00Z");
      d.setUTCDate(4 + dayIdx);
      d.setUTCHours(slots[slotIdx]);
      r16Kickoffs.push(new Date(d));
      slotIdx++;
      if (slotIdx >= 2) { slotIdx = 0; dayIdx++; }
    }
  }
  for (let i = 1; i <= 8; i++) {
    matches.push({ stage: Stage.R16, bracketSlot: `R16-${i}`, kickoff: r16Kickoffs[i - 1] });
  }

  // QF: 4 matches, 2026-07-09 → 2026-07-11
  const qfDays = [9, 9, 11, 11];
  const qfHours = [14, 20, 14, 20];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(`2026-07-${String(qfDays[i - 1]).padStart(2, "0")}T${String(qfHours[i - 1]).padStart(2, "0")}:00:00Z`);
    matches.push({ stage: Stage.QF, bracketSlot: `QF-${i}`, kickoff: d });
  }

  // SF: 2 matches, 2026-07-14 and 2026-07-15
  matches.push({ stage: Stage.SF, bracketSlot: "SF-1", kickoff: new Date("2026-07-14T20:00:00Z") });
  matches.push({ stage: Stage.SF, bracketSlot: "SF-2", kickoff: new Date("2026-07-15T20:00:00Z") });

  // THIRD: 1 match, 2026-07-18
  matches.push({ stage: Stage.THIRD, bracketSlot: "THIRD-1", kickoff: new Date("2026-07-18T16:00:00Z") });

  // FINAL: 1 match, 2026-07-19
  matches.push({ stage: Stage.FINAL, bracketSlot: "FINAL-1", kickoff: new Date("2026-07-19T20:00:00Z") });

  return matches;
}

async function seedKnockout() {
  const knockoutDefs = makeKnockoutMatches();
  console.log(`  → Upsert ${knockoutDefs.length} trận knock-out...`);

  for (const def of knockoutDefs) {
    const externalId = `seed-ko-${def.bracketSlot}`;
    const venueIdx = simpleHash(externalId + "venue") % VENUES.length;

    await prisma.match.upsert({
      where: { externalId },
      update: {
        stage: def.stage,
        bracketSlot: def.bracketSlot,
        kickoff: def.kickoff,
        status: MatchStatus.SCHEDULED,
        venue: VENUES[venueIdx],
        groupName: null,
        homeTeamId: null,
        awayTeamId: null,
      },
      create: {
        externalId,
        stage: def.stage,
        bracketSlot: def.bracketSlot,
        kickoff: def.kickoff,
        status: MatchStatus.SCHEDULED,
        venue: VENUES[venueIdx],
        groupName: null,
        homeTeamId: null,
        awayTeamId: null,
      },
    });
  }

  return knockoutDefs.length;
}

// ─── Seed Markets ────────────────────────────────────────────────────────────

async function seedMarkets() {
  console.log("  → Seeding betting markets...");

  // Only matches that are SCHEDULED AND have both homeTeamId + awayTeamId
  const matches = await prisma.match.findMany({
    where: {
      status: MatchStatus.SCHEDULED,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
    include: { homeTeam: true, awayTeam: true },
  });

  console.log(`     Tìm thấy ${matches.length} trận SCHEDULED với đội xác định`);

  let marketsCreated = 0;
  let selectionsCreated = 0;
  let marketsSkipped = 0;

  for (const match of matches) {
    const homeCode = match.homeTeam?.code ?? "HOM";
    const awayCode = match.awayTeam?.code ?? "AWY";
    const seed = `${match.id}`;

    // Helper: map simpleHash into a range [min, max] with 2 decimal precision
    function oddsBetween(hashKey: string, min: number, max: number): number {
      const raw = simpleHash(seed + hashKey);
      const frac = (raw % 1000) / 1000; // 0..0.999
      return Math.round((min + frac * (max - min)) * 100) / 100;
    }

    // ── 1. MATCH_1X2 ──────────────────────────────────────────────────────────
    const existing1x2 = await prisma.market.findFirst({
      where: { matchId: match.id, type: MarketType.MATCH_1X2 },
    });
    if (!existing1x2) {
      const market = await prisma.market.create({
        data: {
          matchId: match.id,
          type: MarketType.MATCH_1X2,
          line: null,
          mode: "FIXED",
          status: "OPEN",
        },
      });
      const oddsHome = oddsBetween("1x2h", 1.7, 2.8);
      const oddsDraw = oddsBetween("1x2d", 3.0, 3.8);
      const oddsAway = oddsBetween("1x2a", 2.2, 4.2);
      await prisma.marketSelection.createMany({
        data: [
          { marketId: market.id, key: "HOME", label: homeCode, odds: oddsHome },
          { marketId: market.id, key: "DRAW", label: "X", odds: oddsDraw },
          { marketId: market.id, key: "AWAY", label: awayCode, odds: oddsAway },
        ],
      });
      marketsCreated++;
      selectionsCreated += 3;
    } else {
      marketsSkipped++;
    }

    // ── 2. GOALS_OU 2.5 ───────────────────────────────────────────────────────
    const existingGoals = await prisma.market.findFirst({
      where: { matchId: match.id, type: MarketType.GOALS_OU },
    });
    if (!existingGoals) {
      const market = await prisma.market.create({
        data: {
          matchId: match.id,
          type: MarketType.GOALS_OU,
          line: 2.5,
          mode: "FIXED",
          status: "OPEN",
        },
      });
      const oddsOver = oddsBetween("gou_o", 1.75, 2.05);
      const oddsUnder = oddsBetween("gou_u", 1.75, 2.05);
      await prisma.marketSelection.createMany({
        data: [
          { marketId: market.id, key: "OVER", label: "Tài 2.5", odds: oddsOver },
          { marketId: market.id, key: "UNDER", label: "Xỉu 2.5", odds: oddsUnder },
        ],
      });
      marketsCreated++;
      selectionsCreated += 2;
    } else {
      marketsSkipped++;
    }

    // ── 3. CORNERS_OU 9.5 ────────────────────────────────────────────────────
    const existingCorners = await prisma.market.findFirst({
      where: { matchId: match.id, type: MarketType.CORNERS_OU },
    });
    if (!existingCorners) {
      const market = await prisma.market.create({
        data: {
          matchId: match.id,
          type: MarketType.CORNERS_OU,
          line: 9.5,
          mode: "FIXED",
          status: "OPEN",
        },
      });
      const oddsOver = oddsBetween("cou_o", 1.8, 2.0);
      const oddsUnder = oddsBetween("cou_u", 1.8, 2.0);
      await prisma.marketSelection.createMany({
        data: [
          { marketId: market.id, key: "OVER", label: "Tài 9.5", odds: oddsOver },
          { marketId: market.id, key: "UNDER", label: "Xỉu 9.5", odds: oddsUnder },
        ],
      });
      marketsCreated++;
      selectionsCreated += 2;
    } else {
      marketsSkipped++;
    }

    // ── 4. CARDS_OU 3.5 ──────────────────────────────────────────────────────
    const existingCards = await prisma.market.findFirst({
      where: { matchId: match.id, type: MarketType.CARDS_OU },
    });
    if (!existingCards) {
      const market = await prisma.market.create({
        data: {
          matchId: match.id,
          type: MarketType.CARDS_OU,
          line: 3.5,
          mode: "FIXED",
          status: "OPEN",
        },
      });
      const oddsOver = oddsBetween("kou_o", 1.8, 2.0);
      const oddsUnder = oddsBetween("kou_u", 1.8, 2.0);
      await prisma.marketSelection.createMany({
        data: [
          { marketId: market.id, key: "OVER", label: "Tài 3.5", odds: oddsOver },
          { marketId: market.id, key: "UNDER", label: "Xỉu 3.5", odds: oddsUnder },
        ],
      });
      marketsCreated++;
      selectionsCreated += 2;
    } else {
      marketsSkipped++;
    }
  }

  console.log(`\n  Kèo thị trường:`);
  console.log(`     Tạo mới:    ${marketsCreated} markets, ${selectionsCreated} selections`);
  console.log(`     Bỏ qua:     ${marketsSkipped} (đã tồn tại)`);

  return { marketsCreated, selectionsCreated, marketsSkipped };
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
