import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("postgres"), {
      message: "DATABASE_URL phải là postgres connection string",
    }),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET tối thiểu 16 ký tự"),
  // optional ở M0 — chỉ cần khi bật provider thật:
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // AI + cron + data (M5+), tất cả optional — bật khi deploy:
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  FOOTBALL_DATA_API_KEY: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(), // danh sách email admin, phân tách dấu phẩy
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, unknown>): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Env không hợp lệ: ${issues}`);
  }
  return parsed.data;
}
