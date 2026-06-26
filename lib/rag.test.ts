import { describe, it, expect } from "vitest";
import {
  stripDiacritics,
  queryTerms,
  scorePost,
  rankPosts,
  formatMarketsForContext,
  type MarketForContext,
} from "./rag";

describe("stripDiacritics", () => {
  it("bỏ dấu tiếng Việt + đ", () => {
    expect(stripDiacritics("Dự ĐOÁN Bảng Đỏ")).toBe("du doan bang do");
  });
});

describe("queryTerms", () => {
  it("tách từ, bỏ từ < 2 ký tự", () => {
    expect(queryTerms("dự đoán Brazil ở")).toEqual(["du", "doan", "brazil"]);
  });
  it("loại stopword tiếng Việt", () => {
    const t = queryTerms("brazil là gì không liên quan");
    expect(t).toContain("brazil");
    expect(t).not.toContain("la");
    expect(t).not.toContain("gi");
    expect(t).not.toContain("khong");
  });
});

describe("scorePost", () => {
  it("khớp tiêu đề được cộng thêm điểm", () => {
    const p = { title: "Nhận định Brazil", body: "nội dung abc" };
    expect(scorePost(p, ["brazil"])).toBe(2); // body + title
  });
  it("không khớp = 0", () => {
    expect(scorePost({ title: "Bảng A", body: "abc" }, ["xyz"])).toBe(0);
  });
});

describe("rankPosts", () => {
  it("xếp theo độ liên quan, loại bài score 0", () => {
    const posts = [
      { title: "Brazil vô địch", body: "..." },
      { title: "Bảng B", body: "Pháp mạnh" },
      { title: "Không liên quan", body: "xyz" },
    ];
    const r = rankPosts(posts, "brazil", 4);
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe("Brazil vô địch");
  });

  it("giới hạn top-k", () => {
    const posts = Array.from({ length: 6 }, (_, i) => ({ title: `Brazil ${i}`, body: "brazil" }));
    expect(rankPosts(posts, "brazil", 4)).toHaveLength(4);
  });
});

describe("formatMarketsForContext", () => {
  const mk = (over: Partial<MarketForContext> = {}): MarketForContext => ({
    matchId: "m1",
    type: "MATCH_1X2",
    line: null,
    selections: [
      { label: "Brazil", odds: 1.5 },
      { label: "Hòa", odds: 4.0 },
      { label: "Serbia", odds: 6.5 },
    ],
    match: {
      kickoff: new Date("2026-06-15T16:00:00Z"),
      homeTeam: { name: "Brazil" },
      awayTeam: { name: "Serbia" },
    },
    ...over,
  });

  it("rỗng → ghi chú không có kèo", () => {
    expect(formatMarketsForContext([])).toContain("chưa có");
  });

  it("gồm tên trận + tỉ lệ từng cửa", () => {
    const s = formatMarketsForContext([mk()]);
    expect(s).toContain("Brazil vs Serbia");
    expect(s).toContain("1x2");
    expect(s).toContain("Brazil @1.5");
    expect(s).toContain("Serbia @6.5");
  });

  it("hiện ngưỡng (line) cho kèo tài/xỉu, chấp", () => {
    const s = formatMarketsForContext([
      mk({
        type: "GOALS_OU",
        line: 2.5,
        selections: [
          { label: "Tài", odds: 1.9 },
          { label: "Xỉu", odds: 1.95 },
        ],
      }),
    ]);
    expect(s).toContain("Tài/Xỉu bàn thắng (2.5)");
    expect(s).toContain("Tài @1.9");
  });

  it("gộp nhiều kèo cùng 1 trận thành 1 block", () => {
    const s = formatMarketsForContext([
      mk({ type: "MATCH_1X2" }),
      mk({
        type: "GOALS_OU",
        line: 2.5,
        selections: [
          { label: "Tài", odds: 1.9 },
          { label: "Xỉu", odds: 1.95 },
        ],
      }),
    ]);
    expect((s.match(/Brazil vs Serbia/g) || []).length).toBe(1);
    expect(s).toContain("1x2");
    expect(s).toContain("Tài/Xỉu bàn thắng");
  });
});
