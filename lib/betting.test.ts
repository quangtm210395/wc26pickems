import { describe, it, expect } from "vitest";
import { determineMarketResult, fixedPayout, parimutuelPayout, type ResultInput } from "./betting";

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
