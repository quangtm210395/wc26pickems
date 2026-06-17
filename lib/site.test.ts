import { describe, it, expect } from "vitest";
import { siteUrl } from "./site";

const env = (o: Record<string, string | undefined>) => o as NodeJS.ProcessEnv;

describe("siteUrl", () => {
  it("ưu tiên NEXT_PUBLIC_SITE_URL", () => {
    expect(siteUrl(env({ NEXT_PUBLIC_SITE_URL: "https://duongdenngaivang.com" }))).toBe(
      "https://duongdenngaivang.com",
    );
  });

  it("bỏ dấu '/' thừa ở cuối", () => {
    expect(siteUrl(env({ NEXT_PUBLIC_SITE_URL: "https://foo.com/" }))).toBe("https://foo.com");
  });

  it("tự thêm https:// khi thiếu protocol", () => {
    expect(siteUrl(env({ NEXT_PUBLIC_SITE_URL: "foo.com" }))).toBe("https://foo.com");
  });

  it("dùng VERCEL_PROJECT_PRODUCTION_URL khi không có NEXT_PUBLIC_SITE_URL", () => {
    expect(siteUrl(env({ VERCEL_PROJECT_PRODUCTION_URL: "wc26.vercel.app" }))).toBe(
      "https://wc26.vercel.app",
    );
  });

  it("NEXT_PUBLIC_SITE_URL thắng VERCEL", () => {
    expect(
      siteUrl(
        env({
          NEXT_PUBLIC_SITE_URL: "https://a.com",
          VERCEL_PROJECT_PRODUCTION_URL: "b.vercel.app",
        }),
      ),
    ).toBe("https://a.com");
  });

  it("fallback localhost khi không cấu hình gì", () => {
    expect(siteUrl(env({}))).toBe("http://localhost:3000");
  });
});
