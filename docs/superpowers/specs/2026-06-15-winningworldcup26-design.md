# Winning World Cup 26 — Bản thiết kế (Design Spec)

- **Ngày:** 2026-06-15
- **Trạng thái:** Draft chờ review
- **Repo:** `winningworldcup26`
- **Tên hiển thị (display name):** **Đường Đến Ngai Vàng World Cup 2026**
- **Bối cảnh:** Sân chơi dự đoán/soi kèo WC 2026 (48 đội) cho bạn bè. Điểm ảo, không tiền thật. WC đã khởi tranh 11/06, knock-out (R32) ~28/06, CK 19/07.

---

## 1. Tổng quan & mục tiêu

Web app full-stack cho nhóm bạn bè cùng dự đoán, soi kèo, cá cược **điểm ảo** quanh World Cup 2026, với bảng xếp hạng để khoe MXH "thổi trend". AI đảm nhiệm lên bài phân tích hàng ngày và trả lời hỏi đáp (grounded trên các bài đã đăng).

**Mục tiêu:**
- Vòng lặp social lõi (dự đoán → tính điểm → leo BXH → share) hoạt động sớm và vui.
- Tự cập nhật lịch/tỉ số/thông số từ API miễn phí, admin override khi thiếu.
- Một con số điểm duy nhất cho mọi hoạt động → dễ hiểu, dễ flex.
- Deploy free, nhanh (Vercel + Neon), kèm Docker image để sau lên k8s.
- **Mobile-first:** đa số user click từ MXH sang là mobile → thiết kế ưu tiên mobile trước, desktop sau.

**Không phải mục tiêu (v1):** tiền thật, app mobile native, realtime websocket, đăng nhập Facebook (làm sau), mạng quảng cáo thật (stub trước), đa ngôn ngữ ngoài tiếng Việt, anti-cheat phức tạp.

---

## 2. Quyết định đã chốt

| # | Quyết định | Lựa chọn |
|---|---|---|
| 1 | Nguồn data trận đấu | **Free football API auto-sync + admin override** |
| 2 | Phạm vi v1 | **Full scope** (9 nhóm tính năng), build theo thứ tự phụ thuộc |
| 3 | Tỉ lệ kèo & cược | **AI/admin set** — fixed multiplier *hoặc* parimutuel, điểm ảo |
| 4 | Đăng nhập | **Google + email magic-link** ở v1; **Facebook thêm sau** (cần app review) |
| 5 | Mô hình điểm | **1 loại điểm duy nhất** — vừa là ví cược vừa là điểm BXH |
| 6 | Tên repo / hiển thị | `winningworldcup26` · UI: **"Đường Đến Ngai Vàng World Cup 2026"** |
| 7 | AI lên bài | Tạo ở trạng thái **chờ duyệt**, admin 1-click publish (cấu hình được sang auto) |
| 8 | Ưu tiên UI | **Mobile-first** (traffic chủ yếu từ MXH trên mobile) |

---

## 3. Kiến trúc & stack

- **Framework:** Next.js 15 (App Router) + TypeScript — full-stack một cục (UI + API routes + server actions + cron handlers), deploy 1 phát lên Vercel.
- **DB:** Postgres (Neon, free tier) + **Prisma** ORM. Extension **pgvector** cho RAG.
- **Auth:** Auth.js (NextAuth v5) — provider Google + Email (magic-link qua **Resend** free). Facebook provider thêm sau.
- **AI:**
  - Lên bài + chatbot: **Claude API (Anthropic)**, tái dùng phương pháp của skill `predicting-football-matches` (đã có local) để soi kèo/đặt tỉ lệ và viết nhận định.
  - Embeddings cho RAG: **Voyage AI** (đối tác Anthropic, có free tier) → lưu pgvector. Provider embedding tách interface, đổi được.
- **Jobs nền:** **Vercel Cron** — sync data, settle kèo, drip điểm, AI lên bài, refresh leaderboard.
- **UI:** **Mobile-first** (responsive, bottom tab-bar điều hướng, touch target ≥44px, ưu tiên layout 1 cột dọc, hạn chế hover-only) — Tailwind CSS + shadcn/ui; recharts cho thông số; OG image (`@vercel/og`) cho share card.
- **Realtime:** polling + on-demand revalidation (SWR/`revalidatePath`). Đủ ở quy mô bạn bè; Vercel free không có websocket bền.
- **Đóng gói:** Dockerfile multi-stage (Next standalone output) + docker-compose (app + postgres-pgvector) cho local dev & k8s sau.
- **Cấu trúc thư mục (dự kiến):** `app/` (routes), `lib/` (domain: scoring, betting, economy, rag, data-adapters), `components/`, `prisma/`, `cron/`, `tests/`. Mỗi domain module tách biệt, test độc lập.

---

## 4. Mô hình điểm & kinh tế (1 loại điểm "Điểm")

> Toàn bộ là **điểm ảo, không quy đổi tiền thật** — ghi rõ trong ToS để tránh vướng luật cờ bạc (đặc biệt ở VN). Số dư = vừa là tiền cược vừa là điểm xếp hạng.

**Các con số mặc định (đều cấu hình được qua admin/env):**

| Hạng mục | Mặc định |
|---|---|
| Thưởng đăng ký | 1.000đ |
| Drip đăng nhập | +200đ / ngày (1 lần/ngày) |
| Cược tối thiểu | 50đ / kèo |
| Thưởng pickems đúng (theo vòng) | Bảng +50 · R32 +100 · R16 +150 · TK +250 · BK +400 · CK +500 |
| Thưởng đoán đúng vô địch (bracket) | +1.000đ |
| Vay tối đa (dư nợ) | 1.000đ, **lãi 10%** (flat) |
| Nạp khi cạn — Share MXH | +200đ / ngày (1 lần) |
| Nạp khi cạn — Xem QC (v1 stub) | +100đ, cooldown 1h, tối đa 3 lần/ngày |

**Nguồn cộng điểm:** drip hằng ngày · pickems đúng (miễn phí, không stake) · thắng kèo cá cược · share/xem QC · vay (tạm ứng).
**Nguồn trừ điểm:** thua kèo (mất stake) · trả nợ + lãi.

**Vay:** dư nợ tối đa 1.000đ; tự động trừ vào tiền thắng/drip kế tiếp; chưa trả hết → không vay tiếp. Không phạt nặng (giữ vui).

**Sổ cái (WalletTransaction):** mọi biến động ghi 1 dòng ledger (loại, số tiền, số dư sau, ref tới bet/loan/match). Số dư user = tổng ledger — không bao giờ sửa trực tiếp, đảm bảo minh bạch & debug được.

---

## 5. Tính điểm pickems & settle kèo

**Pickems (lớp "kỹ năng", không stake):**
- Vòng bảng: đoán Thắng/Hòa/Thua mỗi trận.
- Knock-out: điền **cả nhánh bracket** (R32 → CK) + đoán đội đi tiếp từng cặp.
- **Khóa pick tại giờ bóng lăn.** Đúng → cộng điểm theo thang ở §4.

**Kèo cá cược (có stake):**
- Loại: **1x2, Tài/Xỉu, Phạt góc (over/under góc), Thẻ (over/under thẻ)**. Kiến trúc cho phép thêm loại.
- Tỉ lệ: mỗi market chọn 1 trong 2 chế độ — **fixed multiplier** (AI/admin set) hoặc **parimutuel** (chia pool theo stake, house edge mặc định 0%).
- Đặt cược: stake ≤ số dư, ≥ tối thiểu; khóa tại giờ bóng lăn.

**Settlement engine (mảng "tiền" — TDD bắt buộc):**
- Kích hoạt khi Match `status = finished` và có kết quả/thông số.
- Trong 1 transaction: settle toàn bộ pickems + markets của trận → tính payout → ghi ledger → cập nhật số dư → refresh leaderboard cache.
- **Idempotent:** cờ `settledAt` chống settle 2 lần.
- Market cần thông số (góc/thẻ) mà API chưa có → giữ `pending`, chờ admin nhập số liệu rồi settle.

---

## 6. Các module

1. **Matches & Lịch** — adapter nguồn (mặc định football-data.org free, interface đổi nguồn) + admin override mọi field. Mỗi trận: tỉ số, trạng thái, thông số (sút/trúng/góc/thẻ/kiểm soát), thông tin trước trận (đội hình dự kiến, phong độ, link bài). **3 view: List / Brackets (48 đội) / Calendar.** Trên mobile: List/Calendar là view mặc định; Brackets cho cuộn ngang + pinch-zoom hoặc thu gọn theo từng nhánh.
2. **Pickems** — pick W/D/L + bracket; khóa theo giờ; thang điểm theo vòng.
3. **Kèo cá cược** — 1x2 / Tài Xỉu / Góc / Thẻ; fixed/parimutuel; auto-settle. Mọi kèo thắng cộng vào **cùng 1 số điểm tổng**.
4. **Ví & kinh tế** — số dư, drip, vay (loan + lãi), nạp (share/ads), sổ cái.
5. **Bảng xếp hạng** — theo tổng điểm; BXH tổng / theo ngày / theo vòng; **share OG card**.
6. **Tin tức + AI author** — bài trước/sau trận, soi kèo, nhận định; AI lên bài hằng ngày qua Cron; admin duyệt/sửa/xóa (mặc định chờ duyệt).
7. **Chatbot RAG** — chỉ trả lời dựa trên bài đã publish (pgvector → Claude), **trích dẫn link bài**; không có nguồn → từ chối, không bịa.
8. **Auth & profile** — Google + magic-link; trang hồ sơ, lịch sử cược, ví.
9. **Admin** — quản trị trận/tỉ số/thông số/market/tỉ lệ, settle & override, duyệt bài, chỉnh ví/điểm user, cấu hình các tham số kinh tế.

---

## 7. Data model (phác Prisma)

- **Auth:** `User`, `Account`, `Session`, `VerificationToken`.
- **Giải đấu:** `Team`, `Stage` (group/R32/R16/QF/SF/Final), `Group`, `BracketSlot`, `Match` (+ `MatchStats`).
- **Dự đoán:** `Pick` (user, match, kiểu, lựa chọn, đúng/sai, điểm), `BracketPick`.
- **Cược:** `Market` (match, type, line, mode, odds/pool, result, status), `Bet` (user, market, stake, payout, status).
- **Ví:** `WalletTransaction` (ledger), `Loan` (principal, interest, outstanding, status).
- **Nội dung:** `Post` (title, body, type, status, authorType=AI/admin, publishedAt), `PostChunk` (text + `vector` embedding pgvector).
- **Chatbot:** `ChatLog` (optional — câu hỏi, bài được trích, trả lời).
- **Cấu hình:** `AppConfig` (key/value cho các tham số kinh tế).

---

## 8. Cron jobs (Vercel Cron)

- **sync-fixtures-scores** — kéo lịch/tỉ số/thông số từ API; cập nhật Match/MatchStats. (Hobby: ~mỗi ngày; gộp + cho phép admin bấm sync thủ công khi cần live.)
- **settle** — quét trận `finished` chưa settle → chạy settlement engine.
- **daily-drip** — cộng điểm drip cho user active.
- **ai-author** — sáng: bài "trước trận" cho các trận trong ngày; tối: recap "sau trận". Tạo draft chờ duyệt.
- **refresh-leaderboard** — tính lại cache BXH.

> Lưu ý Vercel Hobby giới hạn tần suất cron → gộp job + nút "sync ngay" trong admin cho ngày thi đấu.

---

## 9. AI: lên bài + chatbot RAG

**AI author:** Cron gọi Claude với dữ liệu trận + phương pháp skill `predicting-football-matches` → sinh bài soi kèo/nhận định. Mặc định lưu `status=pending`, admin 1-click publish (cấu hình sang auto-publish được).

**Chatbot RAG (grounded nghiêm ngặt):**
- Khi publish bài → chunk + embed (Voyage) → lưu pgvector.
- Hỏi đáp: embed câu hỏi → retrieve top-k chunk từ **bài đã publish** → Claude trả lời **chỉ dựa trên** context, **trích dẫn link bài**.
- Nếu độ liên quan cao nhất < ngưỡng → trả lời "chưa có bài nào đề cập", **không suy đoán**.

---

## 10. Testing

- **Vitest (unit, ưu tiên TDD):** scoring engine, settlement (payout, idempotency), kinh tế (drip/vay/lãi/ledger nhất quán), parimutuel pool math. Đây là phần "tiền", phải chắc.
- **Playwright (smoke e2e):** đăng nhập → đặt pick/cược → settle → BXH cập nhật.
- **Adapter test:** mock response API nguồn, xác minh map đúng + fallback admin.

---

## 11. Deploy & vận hành

- **Vercel Hobby (free)** cho app + cron · **Neon (free)** Postgres + pgvector · **Resend (free)** email magic-link.
- **API key cần (bước deploy):** Anthropic, Voyage, Google OAuth (client id/secret), Resend, football-data.org, `DATABASE_URL` (Neon). Tài liệu hóa trong `.env.example`.
- **GitHub:** push lên GitHub của bạn (sẽ xử lý auth ở bước deploy — chưa có `gh`/`vercel` CLI, sẽ cài hoặc dùng git remote + token).
- **Docker:** Dockerfile multi-stage (Next standalone) + docker-compose (app + postgres-pgvector) để chạy local & build image cho k8s.

---

## 12. Rủi ro & lưu ý

- **Coverage API free cho WC2026 có thể thiếu** thông số sâu (góc/thẻ) → admin override bắt buộc; verify ngay ở M1, đổi nguồn nếu cần.
- **Facebook login** hoãn (cần business verification + app review vài ngày).
- **Rewarded ads** thật cần duyệt mạng QC → v1 stub (cooldown + điểm), gắn AdSense sau.
- **Share MXH** không verify được 100% → cấp điểm qua nút share/ngày.
- **Vercel free:** cron thưa + không websocket → polling, gộp job, nút sync thủ công.
- **Pháp lý:** giữ rõ "điểm ảo, không tiền thật" xuyên suốt UI/ToS.

---

## 13. Lộ trình build (full scope, có cái chạy sớm)

| Milestone | Nội dung | Mốc giá trị |
|---|---|---|
| **M0** | Scaffold Next+TS+Tailwind+Prisma+Neon, Auth (Google+magic-link), Dockerfile, deploy skeleton lên Vercel | App chạy được, đăng nhập được |
| **M1** | Matches & Lịch (adapter + admin + 3 view) | Xem lịch/tỉ số |
| **M2** | Pickems + scoring + Leaderboard | **Vòng lặp social lõi** |
| **M3** | Ví + Kèo (1x2/TX/góc/thẻ) + auto-settle | Cá cược điểm ảo |
| **M4** | Vay + nạp (loan/share/ads stub) | Kinh tế đầy đủ |
| **M5** | News/CMS + AI author (cron) | Bài hằng ngày |
| **M6** | Chatbot RAG | Hỏi đáp grounded |
| **M7** | Admin polish + OG share card + Docker image hoàn chỉnh | Sẵn sàng khoe + k8s |

---

## 14. Câu hỏi mở (giải quyết ở bước plan)

- Giờ chạy cron cụ thể (sáng/tối theo giờ VN).
- Có thêm "matchday bonus" ngoài drip không.
- Mốc gắn AdSense thật.
- Có log hội thoại chatbot không (privacy).
