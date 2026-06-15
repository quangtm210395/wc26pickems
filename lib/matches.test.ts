import { describe, it, expect } from "vitest";
import { groupByDay, groupByGroup, type MatchWithTeams } from "./matches";

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
