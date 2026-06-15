import { describe, it, expect } from "vitest";
import { groupByDay, groupByGroup, groupByStage, type MatchWithTeams } from "./matches";

function fakeMatch(id: string, kickoff: string, groupName: string): MatchWithTeams {
  return {
    id,
    stage: "GROUP",
    groupName,
    matchday: 1,
    bracketSlot: null,
    kickoff: new Date(kickoff),
    status: "SCHEDULED",
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    homePens: null,
    awayPens: null,
    venue: null,
    preview: null,
    externalId: id,
    createdAt: new Date(),
    updatedAt: new Date(),
    homeTeam: null,
    awayTeam: null,
  } as MatchWithTeams;
}

describe("groupByDay", () => {
  it("nhóm theo ngày (giờ VN) và sắp xếp tăng dần", () => {
    const ms = [
      fakeMatch("b", "2026-06-16T10:00:00Z", "A"),
      fakeMatch("a1", "2026-06-15T10:00:00Z", "B"),
      fakeMatch("a2", "2026-06-15T14:00:00Z", "B"),
    ];
    const days = groupByDay(ms);
    expect(days).toHaveLength(2);
    expect(days[0].key < days[1].key).toBe(true);
    expect(days[0].matches).toHaveLength(2);
  });

  it("đẩy trận sau nửa đêm UTC sang đúng ngày VN (+7)", () => {
    // 2026-06-15T18:00Z = 2026-06-16 01:00 giờ VN
    const days = groupByDay([fakeMatch("x", "2026-06-15T18:00:00Z", "A")]);
    expect(days[0].key).toBe("2026-06-16");
  });
});

describe("groupByGroup", () => {
  it("nhóm theo bảng, sắp xếp A..Z", () => {
    const ms = [
      fakeMatch("1", "2026-06-15T10:00:00Z", "B"),
      fakeMatch("2", "2026-06-15T10:00:00Z", "A"),
    ];
    expect(groupByGroup(ms).map((x) => x.name)).toEqual(["A", "B"]);
  });
});

function fakeKoMatch(id: string, stage: MatchWithTeams["stage"]): MatchWithTeams {
  return {
    ...fakeMatch(id, "2026-07-01T20:00:00Z", null as unknown as string),
    stage,
    groupName: null,
  } as MatchWithTeams;
}

describe("groupByStage", () => {
  it("sắp xếp đúng thứ tự R32→R16→QF→SF→THIRD→FINAL", () => {
    const ms = [
      fakeKoMatch("f1", "FINAL"),
      fakeKoMatch("s1", "SF"),
      fakeKoMatch("s2", "SF"),
      fakeKoMatch("q1", "QF"),
      fakeKoMatch("r16a", "R16"),
      fakeKoMatch("r32a", "R32"),
      fakeKoMatch("t1", "THIRD"),
    ];
    const buckets = groupByStage(ms);
    expect(buckets.map((b) => b.stage)).toEqual(["R32", "R16", "QF", "SF", "THIRD", "FINAL"]);
  });

  it("gán nhãn tiếng Việt đúng cho từng stage", () => {
    const ms = [
      fakeKoMatch("r32", "R32"),
      fakeKoMatch("r16", "R16"),
      fakeKoMatch("qf", "QF"),
      fakeKoMatch("sf", "SF"),
      fakeKoMatch("t3", "THIRD"),
      fakeKoMatch("fin", "FINAL"),
    ];
    const labels = groupByStage(ms).map((b) => b.label);
    expect(labels).toEqual(["Vòng 1/16", "Vòng 1/8", "Tứ kết", "Bán kết", "Tranh hạng 3", "Chung kết"]);
  });

  it("bỏ qua stage không có trận", () => {
    const ms = [fakeKoMatch("fin", "FINAL")];
    const buckets = groupByStage(ms);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].stage).toBe("FINAL");
  });

  it("nhóm nhiều trận cùng stage", () => {
    const ms = [
      fakeKoMatch("sf1", "SF"),
      fakeKoMatch("sf2", "SF"),
    ];
    const buckets = groupByStage(ms);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].matches).toHaveLength(2);
  });
});
