import { describe, it, expect } from "vitest";
import { snippetFromMarkdown, postOgImagePath } from "./posts";

describe("snippetFromMarkdown", () => {
  it("loại bỏ ký tự markdown và xuống dòng", () => {
    const md = "## Tiêu đề\n\nĐây là **đoạn** mở đầu với [link](https://x.com) và `code`.";
    const s = snippetFromMarkdown(md, 200);
    expect(s).not.toContain("#");
    expect(s).not.toContain("**");
    expect(s).not.toContain("](");
    expect(s).not.toContain("`");
    expect(s).toContain("Tiêu đề");
    expect(s).toContain("link");
  });

  it("cắt theo maxLen và thêm dấu …", () => {
    const s = snippetFromMarkdown("a".repeat(300), 40);
    expect(s.endsWith("…")).toBe(true);
    expect(s.length).toBe(41); // 40 ký tự + "…"
  });
});

describe("postOgImagePath", () => {
  it("build /api/og?kind=post với title + nhãn loại, encode đúng tiếng Việt", () => {
    const path = postOgImagePath({ title: "Soi kèo ARG vs ALG", type: "TIP" });
    expect(path.startsWith("/api/og?")).toBe(true);

    const qs = new URLSearchParams(path.split("?")[1]);
    expect(qs.get("kind")).toBe("post");
    expect(qs.get("title")).toBe("Soi kèo ARG vs ALG");
    expect(qs.get("type")).toBe("Soi kèo"); // POST_TYPE_LABEL.TIP
  });
});
