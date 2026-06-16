import { describe, it, expect } from "vitest";
import { checkinReward } from "./checkin";

describe("checkinReward", () => {
  it("ngày 1 = 200, không tăng, không thưởng", () => {
    expect(checkinReward(1)).toEqual({ base: 200, bonus: 0, total: 200, growthPct: 0 });
  });

  it("compound +10% mỗi ngày (ví dụ của user: 200 → 220 → 242)", () => {
    expect(checkinReward(2).base).toBe(220);
    expect(checkinReward(3).base).toBe(242);
    expect(checkinReward(2).growthPct).toBe(10);
  });

  it("ngày chia hết cho 5 → +20% thay vì 10%", () => {
    // b4 = round(242*1.1)=266 ; b5 = round(266*1.2)=319
    expect(checkinReward(4).base).toBe(266);
    expect(checkinReward(5).base).toBe(319);
    expect(checkinReward(5).growthPct).toBe(20);
  });

  it("ngày chia hết cho 7 → thưởng thêm 50% (không cộng vào gốc)", () => {
    const d7 = checkinReward(7);
    expect(d7.base).toBe(386); // gốc vẫn compound bình thường
    expect(d7.bonus).toBe(193); // = round(386 * 0.5)
    expect(d7.total).toBe(579);
  });

  it("ngày không chia hết cho 7 thì không có thưởng mốc", () => {
    expect(checkinReward(5).bonus).toBe(0);
    expect(checkinReward(6).bonus).toBe(0);
  });

  it("ngày 35 chia hết cả 5 và 7 → vừa +20% vừa có thưởng mốc", () => {
    const d35 = checkinReward(35);
    expect(d35.growthPct).toBe(20);
    expect(d35.bonus).toBeGreaterThan(0);
  });
});
