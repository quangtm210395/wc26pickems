import { describe, it, expect } from "vitest";
import {
  determineMarketResult,
  fixedPayout,
  parimutuelPayout,
  asianHandicapOutcome,
  asianHandicapReturn,
  ahOutcomeToStatus,
  canCancelBet,
  type ResultInput,
} from "./betting";

function r(p: Partial<ResultInput>): ResultInput {
  return { type: "MATCH_1X2", line: null, homeScore: null, awayScore: null, ...p } as ResultInput;
}

describe("determineMarketResult", () => {
  it("1x2 home", () =>
    expect(determineMarketResult(r({ type: "MATCH_1X2", homeScore: 2, awayScore: 1 }))).toBe("HOME"));
  it("1x2 draw", () =>
    expect(determineMarketResult(r({ type: "MATCH_1X2", homeScore: 1, awayScore: 1 }))).toBe("DRAW"));
  it("1x2 away", () =>
    expect(determineMarketResult(r({ type: "MATCH_1X2", homeScore: 0, awayScore: 2 }))).toBe("AWAY"));

  it("goals over 2.5", () =>
    expect(determineMarketResult(r({ type: "GOALS_OU", line: 2.5, homeScore: 2, awayScore: 1 }))).toBe(
      "OVER",
    ));
  it("goals under 2.5", () =>
    expect(determineMarketResult(r({ type: "GOALS_OU", line: 2.5, homeScore: 1, awayScore: 1 }))).toBe(
      "UNDER",
    ));

  it("corners over", () =>
    expect(
      determineMarketResult(
        r({ type: "CORNERS_OU", line: 8.5, homeScore: 0, awayScore: 0, homeCorners: 5, awayCorners: 5 }),
      ),
    ).toBe("OVER"));
  it("corners null khi thiếu thông số", () =>
    expect(
      determineMarketResult(r({ type: "CORNERS_OU", line: 8.5, homeScore: 0, awayScore: 0 })),
    ).toBeNull());

  it("cards under 3.5", () =>
    expect(
      determineMarketResult(
        r({
          type: "CARDS_OU",
          line: 3.5,
          homeScore: 0,
          awayScore: 0,
          homeYellow: 1,
          awayYellow: 1,
          homeRed: 0,
          awayRed: 0,
        }),
      ),
    ).toBe("UNDER"));

  it("correct score trả 'H-A'", () =>
    expect(determineMarketResult(r({ type: "CORRECT_SCORE", homeScore: 2, awayScore: 1 }))).toBe(
      "2-1",
    ));

  it("null khi chưa có tỉ số", () =>
    expect(determineMarketResult(r({ type: "MATCH_1X2" }))).toBeNull());
});

describe("payouts", () => {
  it("fixed = round(stake*odds)", () => expect(fixedPayout(100, 2.5)).toBe(250));
  it("fixed làm tròn", () => expect(fixedPayout(100, 1.85)).toBe(185));
  it("parimutuel chia pool", () => expect(parimutuelPayout(100, 1000, 400)).toBe(250));
  it("parimutuel không có người thắng = 0", () => expect(parimutuelPayout(100, 1000, 0)).toBe(0));
});

// ─── Kèo chấp châu Á (Asian Handicap) ─────────────────────────────────────────
// line = chấp của ĐỘI NHÀ (âm = nhà chấp/cửa trên). margin = hiệu (theo phía cược) + chấp.

describe("asianHandicapOutcome", () => {
  // Lằn rưỡi (±0.5, ±1.5) — thắng/thua dứt khoát, không push/nửa
  it("home -0.5, nhà thắng 1 trái → WIN", () =>
    expect(asianHandicapOutcome("HOME", -0.5, 1, 0)).toBe("WIN"));
  it("home -0.5, hòa → LOSS", () =>
    expect(asianHandicapOutcome("HOME", -0.5, 0, 0)).toBe("LOSS"));
  it("away +0.5 (line nhà -0.5), hòa → WIN", () =>
    expect(asianHandicapOutcome("AWAY", -0.5, 0, 0)).toBe("WIN"));
  it("home -1.5, nhà thắng 1 trái → LOSS", () =>
    expect(asianHandicapOutcome("HOME", -1.5, 1, 0)).toBe("LOSS"));
  it("home -1.5, nhà thắng 2 trái → WIN", () =>
    expect(asianHandicapOutcome("HOME", -1.5, 2, 0)).toBe("WIN"));

  // Lằn tròn (0, ±1) — có PUSH (hoàn tiền)
  it("đồng banh 0, hòa → PUSH", () =>
    expect(asianHandicapOutcome("HOME", 0, 1, 1)).toBe("PUSH"));
  it("đồng banh 0, nhà thắng → WIN", () =>
    expect(asianHandicapOutcome("HOME", 0, 2, 1)).toBe("WIN"));
  it("đồng banh 0, cược khách, nhà thắng → LOSS", () =>
    expect(asianHandicapOutcome("AWAY", 0, 2, 1)).toBe("LOSS"));
  it("home -1, nhà thắng đúng 1 trái → PUSH", () =>
    expect(asianHandicapOutcome("HOME", -1, 1, 0)).toBe("PUSH"));
  it("home -1, nhà thắng 2 trái → WIN", () =>
    expect(asianHandicapOutcome("HOME", -1, 2, 0)).toBe("WIN"));
  it("home -1, hòa → LOSS", () =>
    expect(asianHandicapOutcome("HOME", -1, 0, 0)).toBe("LOSS"));
  it("away +1, nhà thắng đúng 1 trái → PUSH", () =>
    expect(asianHandicapOutcome("AWAY", -1, 1, 0)).toBe("PUSH"));

  // Lằn 1/4 (±0.25, ±0.75) — thắng nửa / thua nửa
  it("home -0.25, hòa → HALF_LOSS", () =>
    expect(asianHandicapOutcome("HOME", -0.25, 0, 0)).toBe("HALF_LOSS"));
  it("home -0.25, nhà thắng 1 trái → WIN", () =>
    expect(asianHandicapOutcome("HOME", -0.25, 1, 0)).toBe("WIN"));
  it("home +0.25 (nhà được chấp), hòa → HALF_WIN", () =>
    expect(asianHandicapOutcome("HOME", 0.25, 0, 0)).toBe("HALF_WIN"));
  it("home -0.75, nhà thắng 1 trái → HALF_WIN", () =>
    expect(asianHandicapOutcome("HOME", -0.75, 1, 0)).toBe("HALF_WIN"));
  it("home -0.75, hòa → LOSS", () =>
    expect(asianHandicapOutcome("HOME", -0.75, 0, 0)).toBe("LOSS"));
  it("away +0.75 (line nhà -0.75), khách thua 1 trái → HALF_LOSS", () =>
    expect(asianHandicapOutcome("AWAY", -0.75, 1, 0)).toBe("HALF_LOSS"));
  it("home -1.25, nhà thắng 1 trái → HALF_LOSS", () =>
    expect(asianHandicapOutcome("HOME", -1.25, 1, 0)).toBe("HALF_LOSS"));
  it("home -1.25, nhà thắng 2 trái → WIN", () =>
    expect(asianHandicapOutcome("HOME", -1.25, 2, 0)).toBe("WIN"));
});

describe("asianHandicapReturn", () => {
  it("WIN = round(stake*odds)", () => expect(asianHandicapReturn(100, 1.9, "WIN")).toBe(190));
  it("LOSS = 0", () => expect(asianHandicapReturn(100, 1.9, "LOSS")).toBe(0));
  it("PUSH = hoàn nguyên cược", () => expect(asianHandicapReturn(100, 1.9, "PUSH")).toBe(100));
  it("HALF_LOSS = hoàn nửa cược", () => expect(asianHandicapReturn(100, 1.9, "HALF_LOSS")).toBe(50));
  it("HALF_WIN = nửa ăn theo odds + nửa hoàn", () =>
    expect(asianHandicapReturn(100, 1.9, "HALF_WIN")).toBe(145)); // round(50*1.9)=95 + 50
  it("HALF_WIN @2.0", () => expect(asianHandicapReturn(100, 2.0, "HALF_WIN")).toBe(150));
});

describe("ahOutcomeToStatus", () => {
  it("WIN → WON", () => expect(ahOutcomeToStatus("WIN")).toBe("WON"));
  it("HALF_WIN → HALF_WON", () => expect(ahOutcomeToStatus("HALF_WIN")).toBe("HALF_WON"));
  it("PUSH → PUSH", () => expect(ahOutcomeToStatus("PUSH")).toBe("PUSH"));
  it("HALF_LOSS → HALF_LOST", () => expect(ahOutcomeToStatus("HALF_LOSS")).toBe("HALF_LOST"));
  it("LOSS → LOST", () => expect(ahOutcomeToStatus("LOSS")).toBe("LOST"));
});

describe("canCancelBet", () => {
  const now = new Date("2025-01-01T00:00:00Z");
  const future = new Date("2030-01-01T00:00:00Z");
  const past = new Date("2020-01-01T00:00:00Z");

  it("PENDING + market OPEN + chưa tới giờ → hủy được", () =>
    expect(canCancelBet("PENDING", "OPEN", future, now)).toBe(true));
  it("đã tới giờ đá (kickoff ≤ now) → không hủy", () =>
    expect(canCancelBet("PENDING", "OPEN", past, now)).toBe(false));
  it("market đã LOCKED → không hủy", () =>
    expect(canCancelBet("PENDING", "LOCKED", future, now)).toBe(false));
  it("market đã SETTLED → không hủy", () =>
    expect(canCancelBet("PENDING", "SETTLED", future, now)).toBe(false));
  it("kèo đã settle (WON) → không hủy", () =>
    expect(canCancelBet("WON", "OPEN", future, now)).toBe(false));
  it("kèo đã VOID → không hủy", () =>
    expect(canCancelBet("VOID", "OPEN", future, now)).toBe(false));
});
