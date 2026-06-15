import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { prisma } from "@/lib/prisma";

// Magic-link qua Resend. Dev (chưa có AUTH_RESEND_KEY) → in link ra console
// thay vì gửi email thật, để đăng nhập được mà không cần cấu hình email server.
const resendOptions: Parameters<typeof Resend>[0] = {
  apiKey: process.env.AUTH_RESEND_KEY ?? "dev-no-key",
  from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
};
if (!process.env.AUTH_RESEND_KEY) {
  resendOptions.sendVerificationRequest = async ({ identifier, url }) => {
    console.log(`\n🔗 [DEV magic-link] ${identifier} → ${url}\n`);
  };
}

const providers: Provider[] = [Resend(resendOptions)];

// Google chỉ bật khi đã có credentials (tránh lỗi khi dev chưa cấu hình).
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = user.role;
      return session;
    },
  },
});
