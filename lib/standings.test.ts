import { describe, it, expect } from "vitest";
import { computeGroupStandings, type StandingMatch } from "./standings";

const t = (id: string) => ({ id, name: id, flag: null });
const m = (
  h: string,
  a: string,
  hs: number | null,
  as: number | null,
  status = "FINISHED",
): StandingMatch => ({ status, homeScore: hs, awayScore: as, homeTeam: t(h), awayTeam: t(a) });

describe("computeGroupStandings", () => {
  it("tính P/W/D/L/GF/GA/GD/điểm đúng", () => {
    const rows = computeGroupStandings([m("BRA", "SRB", 2, 0), m("BRA", "SUI", 1, 0)]);
    const bra = rows.find((r) => r.teamId === "BRA")!;
    expect(bra.played).toBe(2);
    expect(bra.won).toBe(2);
    expect(bra.points).toBe(6);
    expect(bra.gf).toBe(3);
    expect(bra.ga).toBe(0);
    expect(bra.gd).toBe(3);
  });

  it("đội chưa đá vẫn xuất hiện với chỉ số 0", () => {
    const rows = computeGroupStandings([m("A", "B", null, null, "SCHEDULED")]);
    expect(rows).toHaveLength(2);
    expect(rows[0].played).toBe(0);
    expect(rows[0].points).toBe(0);
  });

  it("hoà → mỗi đội 1 điểm", () => {
    const rows = computeGroupStandings([m("A", "B", 1, 1)]);
    expect(rows.every((r) => r.points === 1 && r.drawn === 1 && r.played === 1)).toBe(true);
  });

  it("xếp theo điểm → hiệu số → bàn thắng", () => {
    // X: hoà Y 0-0 (1đ) + thắng Z 3-0 (3đ) = 4đ, GD +3
    // Y: hoà X 0-0 (1đ) + thắng Z 1-0 (3đ) = 4đ, GD +1
    // Z: thua cả hai = 0đ, GD -4
    const rows = computeGroupStandings([m("X", "Y", 0, 0), m("X", "Z", 3, 0), m("Y", "Z", 1, 0)]);
    expect(rows.map((r) => r.teamId)).toEqual(["X", "Y", "Z"]);
    expect(rows[0].points).toBe(4);
    expect(rows[1].points).toBe(4);
  });

  it("bỏ qua trận chưa xong khi tính chỉ số", () => {
    const rows = computeGroupStandings([m("A", "B", 2, 0), m("A", "B", 9, 9, "LIVE")]);
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a.played).toBe(1);
    expect(a.gf).toBe(2);
  });
});
