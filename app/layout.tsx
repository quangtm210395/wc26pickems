import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Đường Đến Ngai Vàng World Cup 2026",
  description: "Sân chơi dự đoán & soi kèo World Cup 2026 cho anh em bạn bè. Điểm ảo, chơi cho vui.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
