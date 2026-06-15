import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws khi thiếu DATABASE_URL", () => {
    expect(() => parseEnv({ AUTH_SECRET: "supersecretsupersecret" })).toThrow(/DATABASE_URL/);
  });

  it("throws khi AUTH_SECRET quá ngắn", () => {
    expect(() =>
      parseEnv({ DATABASE_URL: "postgresql://u:p@localhost:5432/db", AUTH_SECRET: "short" }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("parse thành công với env hợp lệ", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://u:p@localhost:5432/db",
      AUTH_SECRET: "supersecretsupersecret",
    });
    expect(env.DATABASE_URL).toContain("postgresql://");
    expect(env.AUTH_SECRET).toBe("supersecretsupersecret");
  });
});
