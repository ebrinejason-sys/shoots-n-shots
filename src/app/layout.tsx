import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
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
        <header className="no-print sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
          <div className="masthead h-1.5 w-full" aria-hidden />
          <div className="mx-auto flex w-full max-w-page items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="display text-xl leading-none text-ink">
              Shots <span className="italic text-accent">&amp;</span> Secrets
            </Link>
            <SiteNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-page flex-1 px-5 py-10 sm:py-14">{children}</main>
        <footer className="no-print mx-auto w-full max-w-page border-t border-line px-5 py-8 text-xs text-mute">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Shots &amp; Secrets · Kampala, Uganda</span>
            <span className="tnum uppercase tracking-[0.14em]">
              Tickets scanned at the door · No paper needed
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
