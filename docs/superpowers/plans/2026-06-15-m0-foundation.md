# M0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng bộ khung "Đường Đến Ngai Vàng World Cup 2026" chạy được local + deploy được: Next.js 15 + TS + Tailwind, Prisma + Postgres, Auth.js (Google + magic-link), app shell mobile-first, Dockerfile.

**Architecture:** Một app Next.js (App Router) full-stack. Domain logic ở `lib/`, UI ở `app/` + `components/`. Auth qua Auth.js v5 + Prisma adapter, session lưu DB. Postgres local chạy bằng docker-compose (image `pgvector/pgvector:pg16` để M6 RAG dùng lại). Env validate bằng zod ở `lib/env.ts`. Test bằng Vitest.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, shadcn/ui, Prisma, PostgreSQL (pgvector), Auth.js v5 (`next-auth@beta`), Resend (magic-link prod), Vitest, Docker.

**Quy ước:** package manager = **npm**. Mọi lệnh chạy ở repo root `winningworldcup26/`. Repo đã `git init` (branch `main`) và đã có `docs/superpowers/...`.

---

## File map (M0 tạo/sửa)

- `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` — scaffold
- `vitest.config.ts`, `vitest.setup.ts` — test runner
- `.env.example`, `.env` (local, gitignored) — env
- `lib/env.ts` (+ `lib/env.test.ts`) — validate env
- `lib/prisma.ts` — Prisma singleton
- `prisma/schema.prisma` — model Auth.js
- `docker-compose.yml` — Postgres local
- `app/api/health/route.ts` (+ `app/api/health/route.test.ts`) — health check
- `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/login/page.tsx` — auth
- `app/layout.tsx`, `app/page.tsx`, `app/(tabs)/{lich,pickems,keo,bxh,tin}/page.tsx` — shell
- `components/bottom-nav.tsx`, `components/app-header.tsx` — nav
- `Dockerfile`, `.dockerignore` — đóng gói
- `README.md`, `CLAUDE.md` — docs

---

### Task 1: Scaffold Next.js + Tailwind

**Files:** Create toàn bộ scaffold ở repo root.

- [ ] **Step 1: Chạy create-next-app vào thư mục hiện tại**

Repo root đang có sẵn `docs/` và `.git/`. Tạo app vào chỗ tạm rồi gộp lên để không đụng `docs/`/`.git`:

```bash
cd /Users/hikariq/workspaces/autobots/winningworldcup26
npx --yes create-next-app@latest .app-scaffold \
  --ts --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-npm --no-turbopack --no-git
rsync -a --exclude='.git' .app-scaffold/ ./
rm -rf .app-scaffold
```

- [ ] **Step 2: Verify app boots**

Run:
```bash
npm run dev
```
Expected: server lên ở `http://localhost:3000`, trang Next mặc định render. Dừng (Ctrl-C) sau khi xác nhận.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build PASS, không lỗi TypeScript.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(m0): scaffold Next.js 15 + TS + Tailwind"
```

---

### Task 2: Vitest + env validation (TDD)

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/env.ts`, `lib/env.test.ts`
- Modify: `package.json` (script `test`)

- [ ] **Step 1: Cài Vitest**

```bash
npm i -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 2: Cấu hình Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
  },
});
```

Create `vitest.setup.ts`:
```ts
// Chạy trước mỗi test file. Để trống cho M0; sẽ thêm mock sau.
export {};
```

Add vào `package.json` `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 3: Viết test thất bại cho env**

Create `lib/env.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("throws khi thiếu DATABASE_URL", () => {
    expect(() => parseEnv({ AUTH_SECRET: "x" })).toThrow(/DATABASE_URL/);
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
```

- [ ] **Step 4: Chạy test để xác nhận FAIL**

Run: `npm test -- lib/env.test.ts`
Expected: FAIL — "Cannot find module './env'".

- [ ] **Step 5: Cài zod + viết `lib/env.ts`**

```bash
npm i zod
```

Create `lib/env.ts`:
```ts
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url().refine((v) => v.startsWith("postgres"), {
    message: "DATABASE_URL phải là postgres connection string",
  }),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET tối thiểu 16 ký tự"),
  // optional ở M0 — chỉ cần khi bật provider thật:
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(raw: NodeJS.ProcessEnv | Record<string, unknown>): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Env không hợp lệ: ${issues}`);
  }
  return parsed.data;
}

export const env = parseEnv(process.env);
```

- [ ] **Step 6: Chạy test để xác nhận PASS**

Run: `npm test -- lib/env.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Tạo `.env.example` và `.env` local**

Create `.env.example`:
```bash
# Postgres (local docker-compose mặc định như dưới)
DATABASE_URL="postgresql://wc:wc@localhost:5432/winningworldcup26"
# Bí mật Auth.js — sinh bằng: npx auth secret
AUTH_SECRET=""
# Google OAuth (điền khi deploy)
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
# Magic-link qua Resend (để trống khi dev → link in ra console)
AUTH_RESEND_KEY=""
EMAIL_FROM="Đường Đến Ngai Vàng <onboarding@resend.dev>"
```

Create `.env` (local dev) với cùng nội dung, và set `AUTH_SECRET` bằng `npx auth secret` (hoặc một chuỗi ≥16 ký tự). Xác nhận `.env` nằm trong `.gitignore` (create-next-app đã thêm `.env*`).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(m0): vitest + env validation (zod)"
```

---

### Task 3: Prisma + Postgres local + schema Auth.js

**Files:**
- Create: `docker-compose.yml`, `lib/prisma.ts`, `prisma/schema.prisma`
- Modify: `package.json` (scripts db)

- [ ] **Step 1: docker-compose Postgres (image pgvector)**

Create `docker-compose.yml`:
```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_USER: wc
      POSTGRES_PASSWORD: wc
      POSTGRES_DB: winningworldcup26
    ports:
      - "5432:5432"
    volumes:
      - wc_pgdata:/var/lib/postgresql/data
volumes:
  wc_pgdata:
```

- [ ] **Step 2: Bật DB**

Run: `docker compose up -d db`
Expected: container `db` chạy. Kiểm tra: `docker compose ps` thấy state `running`/`healthy`.

- [ ] **Step 3: Cài Prisma + init**

```bash
npm i -D prisma
npm i @prisma/client
npx prisma init --datasource-provider postgresql
```
Lệnh trên tạo `prisma/schema.prisma` và (có thể) ghi đè `.env` — mở `.env` đảm bảo `DATABASE_URL` vẫn đúng như Task 2.

- [ ] **Step 4: Viết schema Auth.js**

Replace toàn bộ `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          String    @default("user") // "user" | "admin"
  createdAt     DateTime  @default(now())
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 5: Migrate**

Run: `npx prisma migrate dev --name init_auth`
Expected: tạo migration + áp lên DB, sinh Prisma Client. PASS.

- [ ] **Step 6: Prisma singleton**

Create `lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Thêm scripts vào `package.json`: `"db:up": "docker compose up -d db"`, `"db:migrate": "prisma migrate dev"`, `"db:studio": "prisma studio"`, và `"postinstall": "prisma generate"`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(m0): prisma + postgres local + schema auth"
```

---

### Task 4: Health endpoint (TDD)

**Files:**
- Create: `app/api/health/route.ts`, `app/api/health/route.test.ts`

- [ ] **Step 1: Viết test thất bại**

Create `app/api/health/route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("trả về status ok", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });
});
```

- [ ] **Step 2: Run test → FAIL**

Run: `npm test -- app/api/health/route.test.ts`
Expected: FAIL — "Cannot find module './route'".

- [ ] **Step 3: Viết route**

Create `app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", ts: new Date().toISOString() });
}
```

- [ ] **Step 4: Run test → PASS**

Run: `npm test -- app/api/health/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(m0): health endpoint"
```

---

### Task 5: Auth.js v5 (Google + magic-link)

**Files:**
- Create: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- Modify: `package.json` (deps)

- [ ] **Step 1: Cài deps**

```bash
npm i next-auth@beta @auth/prisma-adapter
```

- [ ] **Step 2: Cấu hình auth**

Create `auth.ts`:
```ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import type { EmailConfig } from "next-auth/providers";
import { prisma } from "@/lib/prisma";

// Magic-link: dev (không có key) → in link ra console; prod → gửi qua Resend HTTP API.
const magicLink: EmailConfig = {
  id: "email",
  type: "email",
  name: "Email",
  from: process.env.EMAIL_FROM ?? "dev@localhost",
  maxAge: 24 * 60 * 60,
  // các field bắt buộc của type nhưng ta tự xử lý gửi:
  server: {},
  options: {},
  async sendVerificationRequest({ identifier, url }) {
    if (!process.env.AUTH_RESEND_KEY) {
      console.log(`\n🔗 [DEV magic-link] ${identifier} → ${url}\n`);
      return;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: identifier,
        subject: "Đăng nhập — Đường Đến Ngai Vàng World Cup 2026",
        html: `<p>Bấm vào link để đăng nhập (hết hạn sau 24h):</p><p><a href="${url}">${url}</a></p>`,
      }),
    });
    if (!res.ok) throw new Error(`Gửi email thất bại: ${res.status} ${await res.text()}`);
  },
} as EmailConfig;

const providers: NextAuthConfig["providers"] = [magicLink];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const config: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error role thêm vào schema
        session.user.role = user.role;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
```

> Lưu ý execution: nếu TS than phiền về field thừa của `EmailConfig`, dùng `satisfies`/cast như trên; cốt lõi là `sendVerificationRequest` được gọi. Nếu `next-auth@beta` đổi shape provider email, theo systematic-debugging chỉnh lại cho khớp (mục tiêu hành vi: dev in link console, prod gửi Resend).

- [ ] **Step 3: Route handler**

Create `app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: Sinh AUTH_SECRET (nếu chưa)**

Run: `npx auth secret` (ghi vào `.env`) hoặc set tay `AUTH_SECRET` ≥16 ký tự.

- [ ] **Step 5: Verify magic-link dev hoạt động**

Run: `npm run dev`, mở `http://localhost:3000/api/auth/signin`, nhập email, submit.
Expected: terminal in dòng `🔗 [DEV magic-link] <email> → http://localhost:3000/api/auth/callback/email?...`. Mở link đó → đăng nhập thành công (session tạo trong DB; kiểm `npx prisma studio` thấy bản ghi `Session`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(m0): auth.js (google + magic-link)"
```

---

### Task 6: App shell mobile-first

**Files:**
- Create: `components/bottom-nav.tsx`, `components/app-header.tsx`, `app/login/page.tsx`, `app/(tabs)/lich/page.tsx`, `app/(tabs)/pickems/page.tsx`, `app/(tabs)/keo/page.tsx`, `app/(tabs)/bxh/page.tsx`, `app/(tabs)/tin/page.tsx`
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (nếu cần)

- [ ] **Step 1: Init shadcn/ui + vài component**

```bash
npx --yes shadcn@latest init -d
npx --yes shadcn@latest add button card
```
Expected: tạo `components/ui/*`, `lib/utils.ts`, cập nhật Tailwind config.

- [ ] **Step 2: Bottom nav (mobile-first)**

Create `components/bottom-nav.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/lich", label: "Lịch", icon: "📅" },
  { href: "/pickems", label: "Pickems", icon: "🎯" },
  { href: "/keo", label: "Kèo", icon: "💰" },
  { href: "/bxh", label: "BXH", icon: "🏆" },
  { href: "/tin", label: "Tin", icon: "📰" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 3: Header với trạng thái đăng nhập**

Create `components/app-header.tsx`:
```tsx
import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function AppHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/" className="text-sm font-bold leading-tight">
        👑 Đường Đến Ngai Vàng<br />
        <span className="text-xs font-normal text-muted-foreground">World Cup 2026</span>
      </Link>
      {session?.user ? (
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button className="text-xs text-muted-foreground underline">Đăng xuất</button>
        </form>
      ) : (
        <Link href="/login" className="text-xs font-medium text-primary underline">
          Đăng nhập
        </Link>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Layout bọc header + nav, chừa padding cho bottom nav**

Replace `app/layout.tsx` (giữ phần font/metadata create-next-app sinh, đổi `<body>` thành):
```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

export const metadata: Metadata = {
  title: "Đường Đến Ngai Vàng World Cup 2026",
  description: "Sân chơi dự đoán & soi kèo World Cup 2026 cho anh em bạn bè.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-dvh antialiased">
        <AppHeader />
        <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Trang chủ + 5 trang tab placeholder**

Replace `app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/lich");
}
```

Create mỗi file `app/(tabs)/<tab>/page.tsx` (lich/pickems/keo/bxh/tin) theo mẫu (đổi tiêu đề):
```tsx
import { Card } from "@/components/ui/card";
export default function Page() {
  return (
    <Card className="p-4">
      <h1 className="text-lg font-semibold">Lịch thi đấu</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sắp có ở milestone tới.</p>
    </Card>
  );
}
```
Tiêu đề từng tab: Lịch thi đấu / Pickems / Kèo cá cược / Bảng xếp hạng / Tin tức.

- [ ] **Step 6: Trang login đơn giản**

Create `app/login/page.tsx`:
```tsx
import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  if (await auth()) redirect("/lich");
  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-center text-xl font-bold">Đăng nhập</h1>

      {process.env.AUTH_GOOGLE_ID ? (
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/lich" });
          }}
        >
          <Button className="w-full" type="submit">Tiếp tục với Google</Button>
        </form>
      ) : null}

      <form
        action={async (formData: FormData) => {
          "use server";
          await signIn("email", { email: String(formData.get("email")), redirectTo: "/lich" });
        }}
        className="space-y-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="email@cua-ban.com"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <Button variant="secondary" className="w-full" type="submit">
          Gửi link đăng nhập
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">Điểm ảo, chơi cho vui — không tiền thật.</p>
    </div>
  );
}
```

- [ ] **Step 7: Verify mobile shell**

Run: `npm run dev`, mở DevTools (responsive ~390px). Kiểm: header có tên app, bottom nav 5 tab bấm chuyển trang, `/login` hiển thị form, đăng nhập/đăng xuất đổi trạng thái header. Run `npm run build` → PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(m0): app shell mobile-first (header, bottom-nav, login, tabs)"
```

---

### Task 7: Dockerfile (standalone)

**Files:**
- Create: `Dockerfile`, `.dockerignore`
- Modify: `next.config.ts`

- [ ] **Step 1: Bật standalone output**

Edit `next.config.ts` để có `output: "standalone"`:
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
};
export default nextConfig;
```

- [ ] **Step 2: Dockerfile**

Create `Dockerfile`:
```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- run ----
FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

Create `.dockerignore`:
```
node_modules
.next
.git
docs
*.md
.env*
.app-scaffold
```

- [ ] **Step 3: Verify image build**

Run: `docker build -t winningworldcup26:dev .`
Expected: build PASS (build-time không cần DB; Prisma chỉ `generate`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(m0): dockerfile standalone"
```

---

### Task 8: Docs (README + CLAUDE.md)

**Files:**
- Create: `README.md`, `CLAUDE.md`

- [ ] **Step 1: README**

Create `README.md`:
```markdown
# Đường Đến Ngai Vàng World Cup 2026

Sân chơi dự đoán & soi kèo World Cup 2026 cho bạn bè. Điểm ảo, không tiền thật.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + Postgres (pgvector) · Auth.js v5 (Google + magic-link) · Vitest · Docker.

## Chạy local
```bash
cp .env.example .env        # rồi điền AUTH_SECRET (npx auth secret)
npm install
npm run db:up               # postgres qua docker
npm run db:migrate          # áp schema
npm run dev                 # http://localhost:3000
```
Magic-link khi dev: link đăng nhập in ra console (không cần email server).

## Test
```bash
npm test
```

## Build image
```bash
docker build -t winningworldcup26 .
```

## Tài liệu thiết kế
- Spec: `docs/superpowers/specs/`
- Plans: `docs/superpowers/plans/`
```

- [ ] **Step 2: CLAUDE.md cho repo**

Create `CLAUDE.md`:
```markdown
# CLAUDE.md — winningworldcup26

App dự đoán/soi kèo World Cup 2026 (điểm ảo). UI tiếng Việt, **mobile-first**.

## Quy ước
- Package manager: **npm**. Test: **Vitest** (`npm test`).
- Domain logic ở `lib/` (scoring, betting, economy, rag, data-adapters) — tách khỏi UI, test độc lập.
- Phần "tiền" (scoring/settle/economy) bắt buộc TDD.
- Số dư user = tổng `WalletTransaction` (ledger), không sửa số dư trực tiếp.
- Mobile-first: bottom tab-bar, touch target ≥44px, layout 1 cột.
- Lộ trình build theo milestone trong `docs/superpowers/plans/`.

## Lệnh hay dùng
- `npm run dev` · `npm run build` · `npm test`
- `npm run db:up` · `npm run db:migrate` · `npm run db:studio`
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs(m0): readme + claude.md"
```

---

### Task 9: Provisioning (cần tài khoản của bạn — làm cùng user)

> Task này **không chạy tự động** — cần đăng nhập tài khoản người dùng. Đây là checklist thực thi cùng user ở cuối M0.

- [ ] **GitHub:** tạo repo `winningworldcup26` (private/public tùy bạn), thêm remote, push `main`. Cài `gh` (`brew install gh`) hoặc dùng `git remote add origin <url>` + Personal Access Token.
- [ ] **Neon:** tạo project Postgres free → bật extension `vector` → copy connection string vào Vercel env `DATABASE_URL` (pooled + direct cho Prisma).
- [ ] **Google OAuth:** tạo OAuth client (Web), redirect `https://<domain>/api/auth/callback/google` (+ `http://localhost:3000/...` cho dev) → set `AUTH_GOOGLE_ID/SECRET`.
- [ ] **Resend:** tạo API key + verify domain gửi → set `AUTH_RESEND_KEY`, `EMAIL_FROM`.
- [ ] **Vercel:** import repo, set env (`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, Google, Resend), thêm build step `prisma migrate deploy` → deploy. Verify `/api/health` trả `ok` và đăng nhập chạy trên domain thật.

- [ ] **Commit (nếu có file CI/cấu hình phát sinh):**
```bash
git add -A && git commit -m "chore(m0): provisioning config"
```

---

## Self-review notes

- **Spec coverage (M0 phần):** scaffold ✓ · env ✓ · Prisma+Postgres+pgvector image ✓ · Auth Google+magic-link ✓ · mobile-first shell ✓ · Dockerfile ✓ · deploy checklist ✓. Các module M1–M7 (matches, pickems, betting, economy, news+AI, RAG, admin) **không thuộc M0** — sẽ có plan riêng.
- **Placeholder scan:** các trang tab là placeholder *có chủ đích* (đánh dấu rõ "milestone tới"), không phải placeholder trong code logic.
- **Type consistency:** `parseEnv`/`env` (Task 2), `prisma` (Task 3) dùng lại ở `auth.ts` (Task 5) — khớp tên. `signIn("email"|"google")` khớp provider id ("email" = magic-link, "google").
- **Lưu ý nhạy cảm execution:** shape của `EmailConfig` trong `next-auth@beta` có thể đổi → mục tiêu hành vi (dev console / prod Resend) là tiêu chí nghiệm thu, chỉnh code cho khớp nếu cần.
