# CLAUDE.md — winningworldcup26

App dự đoán/soi kèo World Cup 2026 (**điểm ảo, không tiền thật**). UI **tiếng Việt, mobile-first**. Tên hiển thị: "Đường Đến Ngai Vàng World Cup 2026".

## Môi trường
- **Node ≥ 20.19 (dùng 22, theo `.nvmrc`)** — Node 20.18 lỗi `require(ESM)` khi chạy Vitest. Chạy `nvm use` trước.
- Package manager **npm**. Test **Vitest** (`npm test`).
- DB: Postgres (docker-compose, image `pgvector`) — `npm run db:up` / `npm run db:migrate`.

## Quy ước code
- Domain logic ở `lib/` (sắp tới: `scoring`, `betting`, `economy`, `rag`, `data-adapters`) — tách khỏi UI, test độc lập.
- Phần "tiền" (scoring / settle kèo / kinh tế điểm) **bắt buộc TDD**.
- Số dư user = tổng `WalletTransaction` (ledger) — **không sửa số dư trực tiếp**.
- **Mobile-first**: bottom tab-bar, touch target ≥44px, ưu tiên layout 1 cột.

## Lưu ý kỹ thuật đã chốt (tránh vấp lại)
- **Next.js 16** + React 19 — nhiều breaking change so với 14/15 (xem `@AGENTS.md`).
- **Prisma 6**, KHÔNG dùng 7 (7 bỏ `url` trong schema, đòi driver adapter + `prisma.config.ts`).
- **Auth.js v5** (`next-auth@beta`). Magic-link qua provider **Resend → id là `"resend"`** (không phải `"email"`): dùng `signIn("resend", …)`. Dev chưa có `AUTH_RESEND_KEY` → link in ra console.

## Lệnh hay dùng
`npm run dev` · `npm run build` · `npm test` · `npm run db:up` · `npm run db:migrate` · `npm run db:studio`

## Tài liệu
Spec: `docs/superpowers/specs/` · Plans theo milestone: `docs/superpowers/plans/`

@AGENTS.md
