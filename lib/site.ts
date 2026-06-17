/** Tên hiển thị + mô tả mặc định của app — dùng cho metadata/OG. */
export const SITE_NAME = "Đường Đến Ngai Vàng World Cup 2026";
export const SITE_DESCRIPTION =
  "Sân chơi dự đoán & soi kèo World Cup 2026 cho anh em bạn bè. Điểm ảo, chơi cho vui.";

/**
 * Base URL tuyệt đối của site — dùng cho `metadataBase` và link Open Graph.
 * Scraper preview của Zalo/Messenger/Telegram/Facebook cần URL tuyệt đối,
 * không nhận đường dẫn tương đối → thiếu cái này thì ảnh + link OG hỏng trên production.
 *
 * Thứ tự ưu tiên:
 *  1. NEXT_PUBLIC_SITE_URL — domain riêng, ổn định nhất (vd "https://duongdenngaivang.com")
 *  2. VERCEL_PROJECT_PRODUCTION_URL — domain production Vercel tự set khi deploy (ổn định, không đổi theo từng deploy)
 *  3. http://localhost:3000 — khi chạy dev
 */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    const withProtocol = /^https?:\/\//i.test(explicit)
      ? explicit
      : `https://${explicit}`;
    return withProtocol.replace(/\/+$/, "");
  }

  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
