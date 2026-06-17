import { describe, it, expect } from "vitest";
import { parseFormation, playerPositions, ratingColor } from "./lineup";

describe("parseFormation", () => {
  it("4-3-3 → [4,3,3]", () => expect(parseFormation("4-3-3")).toEqual([4, 3, 3]));
  it("4-2-3-1 → [4,2,3,1]", () => expect(parseFormation("4-2-3-1")).toEqual([4, 2, 3, 1]));
  it("3-5-2 → [3,5,2]", () => expect(parseFormation("3-5-2")).toEqual([3, 5, 2]));
  it("chấp nhận khoảng trắng", () => expect(parseFormation(" 4-4-2 ")).toEqual([4, 4, 2]));
  it("null khi tổng cầu thủ ngoài sân ≠ 10", () => expect(parseFormation("4-4-3")).toBeNull());
  it("null khi không phải số", () => expect(parseFormation("abc")).toBeNull());
  it("null khi rỗng", () => expect(parseFormation("")).toBeNull());
});

describe("playerPositions", () => {
  it("luôn 11 vị trí; index 0 là thủ môn ở giữa, sát khung nhà", () => {
    const p = playerPositions("4-3-3");
    expect(p).toHaveLength(11);
    expect(p[0]).toEqual({ x: 50, y: 8 });
  });

  it("4-3-3: 4 hậu vệ cùng tuyến, dàn đều trái→phải", () => {
    const p = playerPositions("4-3-3");
    expect(p[1].y).toBe(p[4].y); // 4 hậu vệ cùng độ cao
    expect(p[1].x).toBe(20);
    expect(p[2].x).toBe(40);
    expect(p[3].x).toBe(60);
    expect(p[4].x).toBe(80);
  });

  it("4-3-3: tiền đạo ở tuyến cao nhất (xa khung nhà hơn hậu vệ)", () => {
    const p = playerPositions("4-3-3");
    expect(p[8].y).toBe(92);
    expect(p[8].y).toBeGreaterThan(p[1].y);
  });

  it("3 tiền đạo dàn giữa: 25 / 50 / 75", () => {
    const p = playerPositions("4-3-3");
    expect(p[8].x).toBe(25);
    expect(p[9].x).toBe(50);
    expect(p[10].x).toBe(75);
  });

  it("4-2-3-1 cũng đủ 11 vị trí", () => {
    expect(playerPositions("4-2-3-1")).toHaveLength(11);
  });

  it("sơ đồ lạ → fallback vẫn đủ 11 vị trí", () => {
    expect(playerPositions("không-hợp-lệ")).toHaveLength(11);
  });
});

describe("ratingColor", () => {
  it("cùng nhóm cho điểm cùng mức", () => {
    expect(ratingColor(8.4)).toBe(ratingColor(8.0));
    expect(ratingColor(7.4)).toBe(ratingColor(7.0));
  });
  it("đổi màu đúng ngưỡng 8 / 7 / 6", () => {
    expect(ratingColor(8.0)).not.toBe(ratingColor(7.9));
    expect(ratingColor(7.0)).not.toBe(ratingColor(6.9));
    expect(ratingColor(6.0)).not.toBe(ratingColor(5.9));
  });
});
