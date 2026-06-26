import { describe, it, expect } from "vitest";
import { computeTeamStats, type TeamStatMatch } from "./team-stats";

const mkStats = (over: Partial<NonNullable<TeamStatMatch["stats"]>> = {}) => ({
  homeCorners: null,
  awayCorners: null,
  homeYellow: null,
  awayYellow: null,
  homeRed: null,
  awayRed: null,
  homeShots: null,
  awayShots: null,
  homePoss: null,
  awayPoss: null,
  ...over,
});

const m = (over: Partial<TeamStatMatch> = {}): TeamStatMatch => ({
  status: "FINISHED",
  homeTeamId: null,
  awayTeamId: null,
  homeScore: null,
  awayScore: null,
  stats: null,
  ...over,
});

describe("computeTeamStats", () => {
  it("đội nhà thắng + sạch lưới", () => {
    const s = computeTeamStats("T", [m({ homeTeamId: "T", awayTeamId: "X", homeScore: 2, awayScore: 0 })]);
    expect(s.played).toBe(1);
    expect(s.won).toBe(1);
    expect(s.goalsFor).toBe(2);
    expect(s.goalsAgainst).toBe(0);
    expect(s.goalDiff).toBe(2);
    expect(s.cleanSheets).toBe(1);
  });

  it("đội khách — gf/ga lấy đúng cột", () => {
    const s = computeTeamStats("T", [m({ homeTeamId: "X", awayTeamId: "T", homeScore: 1, awayScore: 3 })]);
    expect(s.goalsFor).toBe(3);
    expect(s.goalsAgainst).toBe(1);
    expect(s.won).toBe(1);
  });

  it("hoà → không tính sạch lưới nếu thủng lưới", () => {
    const s = computeTeamStats("T", [m({ homeTeamId: "T", awayTeamId: "X", homeScore: 1, awayScore: 1 })]);
    expect(s.drawn).toBe(1);
    expect(s.cleanSheets).toBe(0);
  });

  it("bỏ trận chưa đá xong", () => {
    const s = computeTeamStats("T", [m({ status: "SCHEDULED", homeTeamId: "T", awayTeamId: "X" })]);
    expect(s.played).toBe(0);
  });

  it("bỏ trận đội không tham gia", () => {
    const s = computeTeamStats("T", [m({ homeTeamId: "A", awayTeamId: "B", homeScore: 1, awayScore: 0 })]);
    expect(s.played).toBe(0);
  });

  it("gộp thông số đúng cột nhà/khách + trung bình kiểm soát bóng", () => {
    const s = computeTeamStats("T", [
      m({
        homeTeamId: "T",
        awayTeamId: "X",
        homeScore: 0,
        awayScore: 0,
        stats: mkStats({ homeCorners: 5, awayCorners: 3, homeShots: 10, homeYellow: 2, homePoss: 60, awayPoss: 40 }),
      }),
      m({
        homeTeamId: "Y",
        awayTeamId: "T",
        homeScore: 0,
        awayScore: 0,
        stats: mkStats({ awayCorners: 7, awayShots: 8, awayYellow: 1, awayPoss: 55, homePoss: 45 }),
      }),
    ]);
    expect(s.corners).toBe(12); // 5 (cột nhà) + 7 (cột khách)
    expect(s.shots).toBe(18); // 10 + 8
    expect(s.yellow).toBe(3); // 2 + 1
    expect(s.avgPoss).toBe(58); // (60 + 55) / 2 = 57.5 → 58
  });

  it("avgPoss = null khi không có dữ liệu kiểm soát", () => {
    const s = computeTeamStats("T", [m({ homeTeamId: "T", awayTeamId: "X", homeScore: 1, awayScore: 0 })]);
    expect(s.avgPoss).toBeNull();
  });
});
