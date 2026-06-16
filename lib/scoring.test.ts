import { describe, it, expect } from "vitest";
import { matchOutcome, scorePick, STAGE_POINTS } from "./scoring";

type M = Parameters<typeof matchOutcome>[0];
function m(p: Partial<M>): M {
  return {
    homeScore: null,
    awayScore: null,
    homePens: null,
    awayPens: null,
    stage: "GROUP",
    ...p,
  } as M;
}

describe("matchOutcome", () => {
  it("home thắng", () => expect(matchOutcome(m({ homeScore: 2, awayScore: 1 }))).toBe("HOME"));
  it("away thắng", () => expect(matchOutcome(m({ homeScore: 0, awayScore: 1 }))).toBe("AWAY"));
  it("vòng bảng hòa = DRAW", () =>
    expect(matchOutcome(m({ homeScore: 1, awayScore: 1, stage: "GROUP" }))).toBe("DRAW"));
  it("knock-out hòa → xét pen (home thắng pen)", () =>
    expect(
      matchOutcome(m({ homeScore: 1, awayScore: 1, stage: "R32", homePens: 4, awayPens: 3 })),
    ).toBe("HOME"));
  it("knock-out hòa → xét pen (away thắng pen)", () =>
    expect(
      matchOutcome(m({ homeScore: 0, awayScore: 0, stage: "FINAL", homePens: 2, awayPens: 4 })),
    ).toBe("AWAY"));
  it("chưa có tỉ số = null", () => expect(matchOutcome(m({}))).toBeNull());
});

describe("scorePick", () => {
  it("đoán đúng vòng bảng = WON +100", () =>
    expect(scorePick("HOME", m({ homeScore: 2, awayScore: 0, stage: "GROUP" }))).toEqual({
      status: "WON",
      points: 100,
    }));
  it("đoán sai = LOST 0", () =>
    expect(scorePick("AWAY", m({ homeScore: 2, awayScore: 0, stage: "GROUP" }))).toEqual({
      status: "LOST",
      points: 0,
    }));
  it("đoán đúng chung kết = +500", () =>
    expect(scorePick("HOME", m({ homeScore: 1, awayScore: 0, stage: "FINAL" }))).toEqual({
      status: "WON",
      points: 500,
    }));
  it("đoán đúng knock-out qua pen = WON theo thang vòng", () =>
    expect(
      scorePick("AWAY", m({ homeScore: 1, awayScore: 1, stage: "QF", homePens: 2, awayPens: 4 })),
    ).toEqual({ status: "WON", points: STAGE_POINTS.QF }));
  it("ném lỗi khi trận chưa có kết quả", () =>
    expect(() => scorePick("HOME", m({}))).toThrow(/chưa có kết quả/));
});
