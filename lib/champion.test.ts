import { describe, it, expect } from "vitest";
import { computeChampionPayouts } from "./champion";

const get = (arr: { userId: string; payout: number }[], id: string) =>
  arr.find((x) => x.userId === id)!.payout;

describe("computeChampionPayouts", () => {
  it("chia pool theo tỉ lệ stake của người thắng (stake đều)", () => {
    const r = computeChampionPayouts(
      [
        { userId: "a", teamId: "X", stake: 100 },
        { userId: "b", teamId: "X", stake: 100 },
        { userId: "c", teamId: "Y", stake: 100 },
      ],
      "X",
    );
    expect(get(r, "a")).toBe(150);
    expect(get(r, "b")).toBe(150);
    expect(get(r, "c")).toBe(0);
  });

  it("chia theo stake không đều", () => {
    const r = computeChampionPayouts(
      [
        { userId: "a", teamId: "X", stake: 100 },
        { userId: "b", teamId: "X", stake: 50 },
        { userId: "c", teamId: "Y", stake: 30 },
      ],
      "X",
    );
    expect(get(r, "a")).toBe(120);
    expect(get(r, "b")).toBe(60);
    expect(get(r, "c")).toBe(0);
  });

  it("không ai đoán đúng → hoàn tiền tất cả", () => {
    const r = computeChampionPayouts(
      [
        { userId: "a", teamId: "X", stake: 100 },
        { userId: "b", teamId: "Y", stake: 100 },
      ],
      "Z",
    );
    expect(r.every((x) => !x.won)).toBe(true);
    expect(get(r, "a")).toBe(100);
    expect(get(r, "b")).toBe(100);
  });

  it("bảo toàn tổng pool khi chia có lẻ", () => {
    const r = computeChampionPayouts(
      [
        { userId: "a", teamId: "X", stake: 1 },
        { userId: "b", teamId: "X", stake: 1 },
        { userId: "c", teamId: "X", stake: 1 },
        { userId: "d", teamId: "Y", stake: 10 },
      ],
      "X",
    );
    expect(r.reduce((s, x) => s + x.payout, 0)).toBe(13); // = tổng pool, không hụt điểm
  });

  it("tất cả đặt đúng → mỗi người nhận lại đúng stake (hoà vốn)", () => {
    const r = computeChampionPayouts(
      [
        { userId: "a", teamId: "X", stake: 200 },
        { userId: "b", teamId: "X", stake: 300 },
      ],
      "X",
    );
    expect(get(r, "a")).toBe(200);
    expect(get(r, "b")).toBe(300);
  });
});
