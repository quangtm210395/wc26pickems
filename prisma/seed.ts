/**
 * prisma/seed.ts — Seed dữ liệu THẬT World Cup 2026 (USA/Canada/Mexico)
 *
 * Nguồn: Wikipedia các trang "2026 FIFA World Cup Group A..L" (tháng 6/2026).
 * 48 đội · 12 bảng A–L · 72 trận vòng bảng (lịch + kết quả thật tới 15/06/2026).
 * Tên đội tiếng Việt, code FIFA, cờ emoji thật.
 *
 * CẢNH BÁO: seed này XOÁ data giải đấu cũ (teams/matches/markets/posts/picks/bets)
 * rồi nạp lại sạch. KHÔNG chạy trên prod khi user đã có dự đoán/cược thật.
 * (BuildCommand trên Vercel chỉ chạy `prisma migrate deploy`, KHÔNG seed.)
 */

import { PrismaClient, MatchStatus, Stage, MarketType, PostType, PostStatus, AuthorType } from "@prisma/client";

const prisma = new PrismaClient();

const TODAY = new Date("2026-06-15T00:00:00Z");

const VENUES = [
  "MetLife Stadium, New York/New Jersey",
  "SoFi Stadium, Los Angeles",
  "Estadio Azteca, Mexico City",
  "BC Place, Vancouver",
  "AT&T Stadium, Dallas",
  "Mercedes-Benz Stadium, Atlanta",
  "Hard Rock Stadium, Miami",
  "Lumen Field, Seattle",
];

// ─── Dữ liệu THẬT: 12 bảng, tên tiếng Việt + code FIFA + cờ ──────────────────

interface TeamDef {
  name: string;
  code: string; // FIFA, unique toàn bộ 48 đội
  flag: string;
}

const GROUPS: Record<string, TeamDef[]> = {
  A: [
    { name: "Mexico", code: "MEX", flag: "🇲🇽" },
    { name: "Hàn Quốc", code: "KOR", flag: "🇰🇷" },
    { name: "Nam Phi", code: "RSA", flag: "🇿🇦" },
    { name: "CH Séc", code: "CZE", flag: "🇨🇿" },
  ],
  B: [
    { name: "Canada", code: "CAN", flag: "🇨🇦" },
    { name: "Thụy Sĩ", code: "SUI", flag: "🇨🇭" },
    { name: "Qatar", code: "QAT", flag: "🇶🇦" },
    { name: "Bosnia & Herzegovina", code: "BIH", flag: "🇧🇦" },
  ],
  C: [
    { name: "Brazil", code: "BRA", flag: "🇧🇷" },
    { name: "Maroc", code: "MAR", flag: "🇲🇦" },
    { name: "Scotland", code: "SCO", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    { name: "Haiti", code: "HAI", flag: "🇭🇹" },
  ],
  D: [
    { name: "Mỹ", code: "USA", flag: "🇺🇸" },
    { name: "Úc", code: "AUS", flag: "🇦🇺" },
    { name: "Paraguay", code: "PAR", flag: "🇵🇾" },
    { name: "Thổ Nhĩ Kỳ", code: "TUR", flag: "🇹🇷" },
  ],
  E: [
    { name: "Đức", code: "GER", flag: "🇩🇪" },
    { name: "Ecuador", code: "ECU", flag: "🇪🇨" },
    { name: "Bờ Biển Ngà", code: "CIV", flag: "🇨🇮" },
    { name: "Curaçao", code: "CUW", flag: "🇨🇼" },
  ],
  F: [
    { name: "Hà Lan", code: "NED", flag: "🇳🇱" },
    { name: "Nhật Bản", code: "JPN", flag: "🇯🇵" },
    { name: "Thụy Điển", code: "SWE", flag: "🇸🇪" },
    { name: "Tunisia", code: "TUN", flag: "🇹🇳" },
  ],
  G: [
    { name: "Bỉ", code: "BEL", flag: "🇧🇪" },
    { name: "Iran", code: "IRN", flag: "🇮🇷" },
    { name: "Ai Cập", code: "EGY", flag: "🇪🇬" },
    { name: "New Zealand", code: "NZL", flag: "🇳🇿" },
  ],
  H: [
    { name: "Tây Ban Nha", code: "ESP", flag: "🇪🇸" },
    { name: "Uruguay", code: "URU", flag: "🇺🇾" },
    { name: "Ả Rập Xê Út", code: "KSA", flag: "🇸🇦" },
    { name: "Cabo Verde", code: "CPV", flag: "🇨🇻" },
  ],
  I: [
    { name: "Pháp", code: "FRA", flag: "🇫🇷" },
    { name: "Senegal", code: "SEN", flag: "🇸🇳" },
    { name: "Na Uy", code: "NOR", flag: "🇳🇴" },
    { name: "Iraq", code: "IRQ", flag: "🇮🇶" },
  ],
  J: [
    { name: "Argentina", code: "ARG", flag: "🇦🇷" },
    { name: "Áo", code: "AUT", flag: "🇦🇹" },
    { name: "Algeria", code: "ALG", flag: "🇩🇿" },
    { name: "Jordan", code: "JOR", flag: "🇯🇴" },
  ],
  K: [
    { name: "Bồ Đào Nha", code: "POR", flag: "🇵🇹" },
    { name: "Colombia", code: "COL", flag: "🇨🇴" },
    { name: "Uzbekistan", code: "UZB", flag: "🇺🇿" },
    { name: "CHDC Congo", code: "COD", flag: "🇨🇩" },
  ],
  L: [
    { name: "Anh", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    { name: "Croatia", code: "CRO", flag: "🇭🇷" },
    { name: "Ghana", code: "GHA", flag: "🇬🇭" },
    { name: "Panama", code: "PAN", flag: "🇵🇦" },
  ],
};

// ─── Lịch + kết quả THẬT (72 trận vòng bảng) ────────────────────────────────
// home/away là code FIFA. status FINISHED có score thật; SCHEDULED score null.

interface MatchDef {
  group: string;
  date: string; // YYYY-MM-DD (giờ kickoff suy ra deterministic)
  home: string;
  away: string;
  hs: number | null;
  as: number | null;
}

const MATCHES: MatchDef[] = [
  // Bảng A
  { group: "A", date: "2026-06-11", home: "MEX", away: "RSA", hs: 2, as: 0 },
  { group: "A", date: "2026-06-11", home: "KOR", away: "CZE", hs: 2, as: 1 },
  { group: "A", date: "2026-06-18", home: "CZE", away: "RSA", hs: null, as: null },
  { group: "A", date: "2026-06-18", home: "MEX", away: "KOR", hs: null, as: null },
  { group: "A", date: "2026-06-24", home: "CZE", away: "MEX", hs: null, as: null },
  { group: "A", date: "2026-06-24", home: "RSA", away: "KOR", hs: null, as: null },
  // Bảng B
  { group: "B", date: "2026-06-12", home: "CAN", away: "BIH", hs: 1, as: 1 },
  { group: "B", date: "2026-06-13", home: "QAT", away: "SUI", hs: 1, as: 1 },
  { group: "B", date: "2026-06-18", home: "SUI", away: "BIH", hs: null, as: null },
  { group: "B", date: "2026-06-18", home: "CAN", away: "QAT", hs: null, as: null },
  { group: "B", date: "2026-06-24", home: "SUI", away: "CAN", hs: null, as: null },
  { group: "B", date: "2026-06-24", home: "BIH", away: "QAT", hs: null, as: null },
  // Bảng C
  { group: "C", date: "2026-06-13", home: "BRA", away: "MAR", hs: 1, as: 1 },
  { group: "C", date: "2026-06-13", home: "HAI", away: "SCO", hs: 0, as: 1 },
  { group: "C", date: "2026-06-19", home: "SCO", away: "MAR", hs: null, as: null },
  { group: "C", date: "2026-06-19", home: "BRA", away: "HAI", hs: null, as: null },
  { group: "C", date: "2026-06-24", home: "SCO", away: "BRA", hs: null, as: null },
  { group: "C", date: "2026-06-24", home: "MAR", away: "HAI", hs: null, as: null },
  // Bảng D
  { group: "D", date: "2026-06-12", home: "USA", away: "PAR", hs: 4, as: 1 },
  { group: "D", date: "2026-06-13", home: "AUS", away: "TUR", hs: 2, as: 0 },
  { group: "D", date: "2026-06-19", home: "USA", away: "AUS", hs: null, as: null },
  { group: "D", date: "2026-06-19", home: "TUR", away: "PAR", hs: null, as: null },
  { group: "D", date: "2026-06-25", home: "TUR", away: "USA", hs: null, as: null },
  { group: "D", date: "2026-06-25", home: "PAR", away: "AUS", hs: null, as: null },
  // Bảng E
  { group: "E", date: "2026-06-14", home: "GER", away: "CUW", hs: 7, as: 1 },
  { group: "E", date: "2026-06-14", home: "CIV", away: "ECU", hs: 1, as: 0 },
  { group: "E", date: "2026-06-20", home: "GER", away: "CIV", hs: null, as: null },
  { group: "E", date: "2026-06-20", home: "ECU", away: "CUW", hs: null, as: null },
  { group: "E", date: "2026-06-25", home: "CUW", away: "CIV", hs: null, as: null },
  { group: "E", date: "2026-06-25", home: "ECU", away: "GER", hs: null, as: null },
  // Bảng F
  { group: "F", date: "2026-06-14", home: "NED", away: "JPN", hs: 2, as: 2 },
  { group: "F", date: "2026-06-14", home: "SWE", away: "TUN", hs: 5, as: 1 },
  { group: "F", date: "2026-06-20", home: "NED", away: "SWE", hs: null, as: null },
  { group: "F", date: "2026-06-20", home: "TUN", away: "JPN", hs: null, as: null },
  { group: "F", date: "2026-06-25", home: "JPN", away: "SWE", hs: null, as: null },
  { group: "F", date: "2026-06-25", home: "TUN", away: "NED", hs: null, as: null },
  // Bảng G
  { group: "G", date: "2026-06-15", home: "IRN", away: "NZL", hs: null, as: null },
  { group: "G", date: "2026-06-15", home: "BEL", away: "EGY", hs: null, as: null },
  { group: "G", date: "2026-06-21", home: "BEL", away: "IRN", hs: null, as: null },
  { group: "G", date: "2026-06-21", home: "NZL", away: "EGY", hs: null, as: null },
  { group: "G", date: "2026-06-26", home: "EGY", away: "IRN", hs: null, as: null },
  { group: "G", date: "2026-06-26", home: "NZL", away: "BEL", hs: null, as: null },
  // Bảng H
  { group: "H", date: "2026-06-15", home: "ESP", away: "CPV", hs: null, as: null },
  { group: "H", date: "2026-06-15", home: "KSA", away: "URU", hs: null, as: null },
  { group: "H", date: "2026-06-21", home: "ESP", away: "KSA", hs: null, as: null },
  { group: "H", date: "2026-06-21", home: "URU", away: "CPV", hs: null, as: null },
  { group: "H", date: "2026-06-26", home: "CPV", away: "KSA", hs: null, as: null },
  { group: "H", date: "2026-06-26", home: "URU", away: "ESP", hs: null, as: null },
  // Bảng I
  { group: "I", date: "2026-06-16", home: "FRA", away: "SEN", hs: null, as: null },
  { group: "I", date: "2026-06-16", home: "IRQ", away: "NOR", hs: null, as: null },
  { group: "I", date: "2026-06-22", home: "FRA", away: "IRQ", hs: null, as: null },
  { group: "I", date: "2026-06-22", home: "NOR", away: "SEN", hs: null, as: null },
  { group: "I", date: "2026-06-26", home: "NOR", away: "FRA", hs: null, as: null },
  { group: "I", date: "2026-06-26", home: "SEN", away: "IRQ", hs: null, as: null },
  // Bảng J
  { group: "J", date: "2026-06-16", home: "ARG", away: "ALG", hs: null, as: null },
  { group: "J", date: "2026-06-16", home: "AUT", away: "JOR", hs: null, as: null },
  { group: "J", date: "2026-06-22", home: "ARG", away: "AUT", hs: null, as: null },
  { group: "J", date: "2026-06-22", home: "JOR", away: "ALG", hs: null, as: null },
  { group: "J", date: "2026-06-27", home: "ALG", away: "AUT", hs: null, as: null },
  { group: "J", date: "2026-06-27", home: "JOR", away: "ARG", hs: null, as: null },
  // Bảng K
  { group: "K", date: "2026-06-17", home: "POR", away: "COD", hs: null, as: null },
  { group: "K", date: "2026-06-17", home: "UZB", away: "COL", hs: null, as: null },
  { group: "K", date: "2026-06-23", home: "POR", away: "UZB", hs: null, as: null },
  { group: "K", date: "2026-06-23", home: "COL", away: "COD", hs: null, as: null },
  { group: "K", date: "2026-06-27", home: "COL", away: "POR", hs: null, as: null },
  { group: "K", date: "2026-06-27", home: "COD", away: "UZB", hs: null, as: null },
  // Bảng L
  { group: "L", date: "2026-06-17", home: "ENG", away: "CRO", hs: null, as: null },
  { group: "L", date: "2026-06-17", home: "GHA", away: "PAN", hs: null, as: null },
  { group: "L", date: "2026-06-23", home: "ENG", away: "GHA", hs: null, as: null },
  { group: "L", date: "2026-06-23", home: "PAN", away: "CRO", hs: null, as: null },
  { group: "L", date: "2026-06-27", home: "PAN", away: "ENG", hs: null, as: null },
  { group: "L", date: "2026-06-27", home: "CRO", away: "GHA", hs: null, as: null },
];

function simpleHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

const PREVIEWS = [
  "Trận đấu hứa hẹn kịch tính, cả hai đội đều muốn giành trọn 3 điểm.",
  "Cuộc đối đầu đáng chú ý giữa hai lối chơi trái ngược.",
  "Trận cầu sống còn — kẻ sảy chân có nguy cơ bị loại sớm.",
  "Cả hai đều cần điểm để rộng cửa vào vòng knock-out.",
  "Ngôi sao nào sẽ tỏa sáng trong trận cầu nhiều kỳ vọng này?",
  "Cuộc chiến giữa hàng công sắc bén và hàng thủ lì lợm.",
];

function getPreview(id: string): string {
  return PREVIEWS[simpleHash(id + "p") % PREVIEWS.length];
}

/** Giờ kickoff deterministic (UTC) suy từ ngày + externalId, để sắp xếp đẹp. */
function kickoffFor(date: string, id: string): Date {
  const hours = [13, 16, 19, 22];
  const h = hours[simpleHash(id) % hours.length];
  return new Date(`${date}T${String(h).padStart(2, "0")}:00:00Z`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seed data THẬT World Cup 2026...");

  // 0. Xoá sạch data giải đấu cũ (giữ user/ví/loan). Thứ tự an toàn FK.
  console.log("  → Xoá data giải đấu cũ...");
  await prisma.bet.deleteMany();
  await prisma.pick.deleteMany();
  await prisma.marketSelection.deleteMany();
  await prisma.market.deleteMany();
  await prisma.matchStats.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.group.deleteMany();
  await prisma.post.deleteMany();

  // 1. Groups + Teams
  const groupLetters = Object.keys(GROUPS);
  const teamId: Record<string, string> = {};
  for (const letter of groupLetters) {
    const g = await prisma.group.create({ data: { name: letter } });
    for (const t of GROUPS[letter]) {
      const team = await prisma.team.create({
        data: { name: t.name, code: t.code, flag: t.flag, groupId: g.id },
      });
      teamId[t.code] = team.id;
    }
  }
  console.log(`  → ${groupLetters.length} bảng · ${Object.keys(teamId).length} đội`);

  // 2. Group matches (thật)
  let finished = 0;
  for (const m of MATCHES) {
    const externalId = `wc26-${m.group}-${m.home}-${m.away}`;
    const done = m.hs != null && m.as != null;
    const kickoff = kickoffFor(m.date, externalId);
    await prisma.match.create({
      data: {
        externalId,
        stage: Stage.GROUP,
        groupName: m.group,
        kickoff,
        status: done ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
        homeTeamId: teamId[m.home],
        awayTeamId: teamId[m.away],
        homeScore: m.hs,
        awayScore: m.as,
        venue: VENUES[simpleHash(externalId + "v") % VENUES.length],
        preview: done ? null : getPreview(externalId),
      },
    });
    if (done) finished++;
  }
  console.log(`  → ${MATCHES.length} trận vòng bảng (${finished} đã đá thật)`);

  // 3. Knockout slots (TBD) + 4. Markets + 5. Posts
  const ko = await seedKnockout();
  const mk = await seedMarkets();
  const posts = await seedPosts();

  console.log("\n✅ Seed hoàn tất (data thật):");
  console.log(`   Bảng: ${groupLetters.length} · Đội: ${Object.keys(teamId).length}`);
  console.log(`   Vòng bảng: ${MATCHES.length} (đã đá ${finished}) · Knock-out: ${ko}`);
  console.log(`   Markets: ${mk.marketsCreated} · Bài viết: ${posts}`);
}

// ─── Knockout (TBD slots) ───────────────────────────────────────────────────

function makeKnockoutMatches(): { stage: Stage; bracketSlot: string; kickoff: Date }[] {
  const out: { stage: Stage; bracketSlot: string; kickoff: Date }[] = [];
  const slots = [14, 17, 20];
  for (let i = 0; i < 16; i++) {
    const d = new Date("2026-06-28T00:00:00Z");
    d.setUTCDate(28 + Math.floor(i / 3));
    d.setUTCHours(slots[i % 3]);
    out.push({ stage: Stage.R32, bracketSlot: `R32-${i + 1}`, kickoff: new Date(d) });
  }
  for (let i = 0; i < 8; i++) {
    const d = new Date("2026-07-04T00:00:00Z");
    d.setUTCDate(4 + Math.floor(i / 2));
    d.setUTCHours(i % 2 === 0 ? 14 : 20);
    out.push({ stage: Stage.R16, bracketSlot: `R16-${i + 1}`, kickoff: new Date(d) });
  }
  const qfDays = [9, 9, 11, 11];
  const qfHours = [14, 20, 14, 20];
  for (let i = 0; i < 4; i++) {
    out.push({
      stage: Stage.QF,
      bracketSlot: `QF-${i + 1}`,
      kickoff: new Date(
        `2026-07-${String(qfDays[i]).padStart(2, "0")}T${String(qfHours[i]).padStart(2, "0")}:00:00Z`,
      ),
    });
  }
  out.push({ stage: Stage.SF, bracketSlot: "SF-1", kickoff: new Date("2026-07-14T20:00:00Z") });
  out.push({ stage: Stage.SF, bracketSlot: "SF-2", kickoff: new Date("2026-07-15T20:00:00Z") });
  out.push({ stage: Stage.THIRD, bracketSlot: "THIRD-1", kickoff: new Date("2026-07-18T16:00:00Z") });
  out.push({ stage: Stage.FINAL, bracketSlot: "FINAL-1", kickoff: new Date("2026-07-19T20:00:00Z") });
  return out;
}

async function seedKnockout(): Promise<number> {
  const defs = makeKnockoutMatches();
  for (const def of defs) {
    await prisma.match.create({
      data: {
        externalId: `wc26-ko-${def.bracketSlot}`,
        stage: def.stage,
        bracketSlot: def.bracketSlot,
        kickoff: def.kickoff,
        status: MatchStatus.SCHEDULED,
        venue: VENUES[simpleHash(def.bracketSlot + "v") % VENUES.length],
      },
    });
  }
  return defs.length;
}

// ─── Markets cho trận vòng bảng SCHEDULED (có đủ 2 đội) ─────────────────────

async function seedMarkets() {
  const matches = await prisma.match.findMany({
    where: { status: MatchStatus.SCHEDULED, homeTeamId: { not: null }, awayTeamId: { not: null } },
    include: { homeTeam: true, awayTeam: true },
  });
  let marketsCreated = 0;
  let selectionsCreated = 0;
  for (const match of matches) {
    const seed = match.id;
    const odds = (k: string, min: number, max: number) =>
      Math.round((min + ((simpleHash(seed + k) % 1000) / 1000) * (max - min)) * 100) / 100;

    const mk1 = await prisma.market.create({
      data: { matchId: match.id, type: MarketType.MATCH_1X2, mode: "FIXED", status: "OPEN" },
    });
    await prisma.marketSelection.createMany({
      data: [
        { marketId: mk1.id, key: "HOME", label: match.homeTeam?.code ?? "1", odds: odds("1xh", 1.7, 2.8) },
        { marketId: mk1.id, key: "DRAW", label: "Hòa", odds: odds("1xd", 3.0, 3.8) },
        { marketId: mk1.id, key: "AWAY", label: match.awayTeam?.code ?? "2", odds: odds("1xa", 2.2, 4.2) },
      ],
    });
    const ouDefs: { type: MarketType; line: number; over: string; under: string }[] = [
      { type: MarketType.GOALS_OU, line: 2.5, over: "Tài 2.5", under: "Xỉu 2.5" },
      { type: MarketType.CORNERS_OU, line: 9.5, over: "Tài 9.5", under: "Xỉu 9.5" },
      { type: MarketType.CARDS_OU, line: 3.5, over: "Tài 3.5", under: "Xỉu 3.5" },
    ];
    for (const d of ouDefs) {
      const m = await prisma.market.create({
        data: { matchId: match.id, type: d.type, line: d.line, mode: "FIXED", status: "OPEN" },
      });
      await prisma.marketSelection.createMany({
        data: [
          { marketId: m.id, key: "OVER", label: d.over, odds: odds(d.type + "o", 1.75, 2.05) },
          { marketId: m.id, key: "UNDER", label: d.under, odds: odds(d.type + "u", 1.75, 2.05) },
        ],
      });
    }
    marketsCreated += 4;
    selectionsCreated += 9;
  }
  return { marketsCreated, selectionsCreated };
}

// ─── Bài viết mẫu (đội THẬT) ────────────────────────────────────────────────

const SAMPLE_POSTS: { slug: string; title: string; body: string; type: PostType; publishedAt: Date }[] = [
  {
    slug: "nhan-dinh-bang-c-brazil",
    title: "Nhận định Bảng C: Brazil so tài Maroc, Scotland & Haiti",
    type: PostType.ANALYSIS,
    publishedAt: new Date("2026-06-12T08:00:00Z"),
    body: `## Tổng quan Bảng C

Bảng C quy tụ **Brazil**, **Maroc**, **Scotland** và **Haiti** — một bảng đấu nhiều màu sắc.

**Brazil** là ứng viên số một, nhưng trận hòa 1-1 trước **Maroc** ngày ra quân cho thấy đoàn quân Selecao không hề dễ thở. Maroc — đội từng vào bán kết 2022 — vẫn lì lợm và khó chịu.

**Scotland** khởi đầu thuận lợi khi thắng **Haiti** 1-0, mở ra cơ hội cạnh tranh tấm vé đi tiếp.

## Dự đoán
- 1. Brazil  ·  2. Maroc  ·  3. Scotland  ·  4. Haiti

Trận **Scotland vs Brazil** lượt cuối hứa hẹn quyết định ngôi đầu bảng.`,
  },
  {
    slug: "nhan-dinh-bang-h-tay-ban-nha",
    title: "Nhận định Bảng H: Tây Ban Nha, Uruguay và những ẩn số",
    type: PostType.ANALYSIS,
    publishedAt: new Date("2026-06-14T09:00:00Z"),
    body: `## Bảng H — không có chỗ cho sai lầm

**Tây Ban Nha** mang tới giải lối chơi kiểm soát bóng hàng đầu thế giới và là ứng viên vô địch thực thụ. **Uruguay** giàu kinh nghiệm, luôn biết cách gây khó cho mọi đối thủ.

Hai ẩn số **Ả Rập Xê Út** và **Cabo Verde** — đại diện lần đầu góp mặt — sẽ quyết tâm tạo bất ngờ như cách Ả Rập từng hạ Argentina năm 2022.

## Cặp đáng xem
**Ả Rập Xê Út vs Uruguay** ngày 15/6 — bên nào nhập cuộc tốt hơn sẽ chiếm lợi thế lớn.`,
  },
  {
    slug: "sau-tran-duc-7-1-curacao",
    title: "Sau trận: Đức vùi dập Curaçao 7-1 ngày ra quân",
    type: PostType.RECAP,
    publishedAt: new Date("2026-06-14T22:00:00Z"),
    body: `## Đức 7-1 Curaçao (FT)

Cỗ xe tăng Đức khởi đầu World Cup 2026 bằng màn trình diễn hủy diệt, vùi dập tân binh **Curaçao** tới **7-1** tại Bảng E.

Đây là lời cảnh báo đanh thép tới các đối thủ: Die Mannschaft đã trở lại đúng nghĩa một ứng viên nặng ký.

Ở trận còn lại của bảng, **Bờ Biển Ngà** thắng **Ecuador** 1-0 đầy bản lĩnh, khiến Bảng E hứa hẹn cuộc đua tam mã cực kỳ hấp dẫn cho hai tấm vé.`,
  },
  {
    slug: "sau-tran-my-4-1-paraguay",
    title: "Sau trận: Chủ nhà Mỹ thắng đậm Paraguay 4-1",
    type: PostType.RECAP,
    publishedAt: new Date("2026-06-12T23:00:00Z"),
    body: `## Mỹ 4-1 Paraguay (FT)

Trước sự cổ vũ của khán giả nhà, tuyển **Mỹ** đã có màn ra quân trong mơ khi đánh bại **Paraguay** với tỉ số đậm **4-1** tại Bảng D.

Cùng bảng, **Úc** cũng gây ấn tượng khi hạ **Thổ Nhĩ Kỳ** 2-0. Hai chiến thắng đậm khiến Bảng D trở nên khó lường ở các lượt tiếp theo.

Trận **Mỹ vs Úc** ngày 19/6 gần như sẽ định đoạt ngôi đầu bảng.`,
  },
  {
    slug: "soi-keo-luot-2-vong-bang",
    title: "Soi kèo lượt 2 vòng bảng: vài cặp đấu đáng chú ý",
    type: PostType.TIP,
    publishedAt: new Date("2026-06-15T07:00:00Z"),
    body: `## Soi kèo lượt 2 (chỉ để vui — điểm ảo)

> Phân tích thuần dữ liệu, mang tính tham khảo. Không phải tiền thật.

**Pháp vs Senegal (16/6)** — Pháp nhỉnh hơn về đẳng cấp, nhưng Senegal đủ sức cầm hòa. Gợi ý: *Tài 2.5 bàn*.

**Argentina vs Algeria (16/6)** — Đương kim vô địch Argentina được đánh giá cao. Gợi ý: *Argentina thắng kèo 1×2*.

**Tây Ban Nha vs Cabo Verde** — chênh lệch lớn. Gợi ý: *Tây Ban Nha thắng & Tài 2.5*.

Nhớ là cược cho vui, dùng điểm ảo trong app nhé!`,
  },
];

async function seedPosts(): Promise<number> {
  for (const p of SAMPLE_POSTS) {
    await prisma.post.create({
      data: {
        slug: p.slug,
        title: p.title,
        body: p.body,
        type: p.type,
        status: PostStatus.PUBLISHED,
        authorType: AuthorType.AI,
        publishedAt: p.publishedAt,
      },
    });
  }
  return SAMPLE_POSTS.length;
}

main()
  .catch((e) => {
    console.error("❌ Seed thất bại:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
