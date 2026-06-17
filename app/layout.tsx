import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Oswald } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";
import { siteUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Body font — full Vietnamese support, clean & legible on mobile.
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Display/heading font — condensed, sporty, premium. Used for the app title,
// big headings, and big numbers (scores, points, ranks).
const oswald = Oswald({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  // Bắt buộc cho OG: scraper chat cần URL tuyệt đối; nếu không có, ảnh/link OG sẽ trỏ về localhost.
  metadataBase: new URL(siteUrl()),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C0A09",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`dark ${beVietnamPro.variable} ${oswald.variable} antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto w-full max-w-md px-4 pb-24 pt-4">{children}</main>
        <Link
          href="/hoi-dap"
          aria-label="Hỏi đáp AI"
          className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-primary/40 transition-transform active:scale-95"
        >
          💬
        </Link>
        <BottomNav />
      </body>
    </html>
  );
}
