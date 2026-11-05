import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const displayFont = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shots & Secrets — Tickets",
  description: "Book, pay and scan tickets for Shots & Secrets House Party.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sansFont.variable} ${displayFont.variable} flex min-h-screen flex-col`}>
        <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-paper/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="display flex items-baseline gap-1.5 text-sm">
              <span className="text-accent glow-blue">Shots</span>
              <span className="text-hot">&amp;</span>
              <span className="text-ink">Secrets</span>
            </Link>
            <SiteNav />
          </div>
          <div className="hairline h-px w-full opacity-40" />
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <footer className="no-print mx-auto w-full max-w-5xl px-4 pb-8 text-xs text-mute/70">
          Prototype build · Payments run in mock mode unless Flutterwave keys are configured.
        </footer>
      </body>
    </html>
  );
}
