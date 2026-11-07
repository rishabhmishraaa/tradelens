import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AuthStatus } from "./auth-status";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradeLens",
  description: "An AI trade journal: log trades, see your patterns, review each session.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/15">
          <Link href="/" className="font-semibold tracking-tight">
            TradeLens
          </Link>
          {/* Reads the session cookie, so it streams in behind a boundary (Cache Components). */}
          <Suspense fallback={<span className="text-sm opacity-60">…</span>}>
            <AuthStatus />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
