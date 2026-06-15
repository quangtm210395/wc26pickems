import { describe, it, expect } from "vitest";
import { stripDiacritics, queryTerms, scorePost, rankPosts } from "./rag";

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
