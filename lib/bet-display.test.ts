import { describe, it, expect } from "vitest";
import { selectionLabel, potentialReturn, MARKET_TYPE_LABEL } from "./bet-display";

describe("selectionLabel", () => {
  const sels = [
    { key: "HOME", label: "Brazil -0.5" },
    { key: "AWAY", label: "Hàn Quốc +0.5" },
  ];
  it("trả label theo key", () => expect(selectionLabel("HOME", sels)).toBe("Brazil -0.5"));
  it("fallback về key khi không tìm thấy", () => expect(selectionLabel("DRAW", sels)).toBe("DRAW"));
});

describe("potentialReturn", () => {
  it("round(stake*odds) khi có odds (kèo FIXED)", () =>
    expect(potentialReturn(100, 1.9)).toBe(190));
  it("null khi không có odds (parimutuel)", () => expect(potentialReturn(100, null)).toBeNull());
});

describe("MARKET_TYPE_LABEL", () => {
  it("có nhãn cho mọi loại kèo gồm ASIAN_HANDICAP", () => {
    expect(MARKET_TYPE_LABEL.MATCH_1X2).toBeTruthy();
    expect(MARKET_TYPE_LABEL.ASIAN_HANDICAP).toBeTruthy();
    expect(MARKET_TYPE_LABEL.CORRECT_SCORE).toBeTruthy();
  });
});
