import { describe, it, expect } from "vitest";
import { startOfVnDay, loanOutstanding } from "./wallet";

describe("startOfVnDay", () => {
  it("buổi sáng VN → mốc 00:00 VN cùng ngày (17:00 UTC hôm trước)", () => {
    // 2026-06-15T03:00Z = 10:00 VN ngày 15 → start = 2026-06-14T17:00Z
    const start = startOfVnDay(new Date("2026-06-15T03:00:00Z"));
    expect(start.toISOString()).toBe("2026-06-14T17:00:00.000Z");
  });
  it("ngay sau nửa đêm VN vẫn về mốc đầu ngày VN", () => {
    // 2026-06-15T18:00Z = 01:00 VN ngày 16 → start = 2026-06-15T17:00Z
    const start = startOfVnDay(new Date("2026-06-15T18:00:00Z"));
    expect(start.toISOString()).toBe("2026-06-15T17:00:00.000Z");
  });
});

describe("loanOutstanding", () => {
  it("vay 1000, lãi 10% → 1100", () => expect(loanOutstanding(1000)).toBe(1100));
  it("vay 500, lãi 10% → 550", () => expect(loanOutstanding(500)).toBe(550));
  it("làm tròn", () => expect(loanOutstanding(333)).toBe(366));
});
