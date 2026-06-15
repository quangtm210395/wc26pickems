# 👑 Đường Đến Ngai Vàng World Cup 2026

Sân chơi dự đoán & soi kèo World Cup 2026 cho anh em bạn bè. **Điểm ảo, chơi cho vui — không tiền thật.**

> Repo: `winningworldcup26`. Tài liệu thiết kế & lộ trình build: `docs/superpowers/`.

## Tính năng (theo lộ trình)
- **Lịch thi đấu**: list / brackets / calendar, tỉ số & thông số, thông tin trước trận
- **Pickems**: dự đoán đội thắng từng trận + bracket cả giải
- **Kèo cá cược điểm ảo**: 1x2 · Tài Xỉu · Phạt góc · Thẻ (auto-settle)
- **Kinh tế điểm**: drip hằng ngày, vay (lãi), nạp qua share/quảng cáo, sổ cái
- **Bảng xếp hạng** + share card MXH
- **Tin tức** do AI lên bài hằng ngày + **chatbot RAG** (chỉ trả lời theo bài đã đăng)
- **Đăng nhập** Google + magic-link (Facebook thêm sau)

Hiện đã xong **M0 — nền tảng**. Các milestone kế tiếp: xem `docs/superpowers/plans/`.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Prisma 6 + Postgres (pgvector) · Auth.js v5 · Vitest · Docker. Deploy: Vercel (+ Neon, Resend).

## Yêu cầu
- **Node ≥ 20.19** (khuyến nghị 22 — có sẵn `.nvmrc`): `nvm use`
- Docker (chạy Postgres local)

## Chạy local
```bash
nvm use                          # Node 22 theo .nvmrc
cp .env.example .env
# sinh AUTH_SECRET rồi dán vào .env:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
npm install
npm run db:up                    # Postgres qua docker-compose
npm run db:migrate               # áp schema
npm run dev                      # http://localhost:3000
```
**Magic-link khi dev:** không cần email server — link đăng nhập **in ra console**. Đặt `AUTH_RESEND_KEY` để gửi email thật qua Resend.
**Google:** để trống `AUTH_GOOGLE_ID/SECRET` thì nút Google tự ẩn.

## Test
```bash
npm test
```

## Đóng gói image (cho k8s sau)
```bash
docker build -t winningworldcup26 .
docker run -p 3000:3000 --env-file .env winningworldcup26
```

## Biến môi trường
Xem `.env.example`: `DATABASE_URL` · `AUTH_SECRET` · `AUTH_GOOGLE_ID/SECRET` · `AUTH_RESEND_KEY` · `EMAIL_FROM`.
