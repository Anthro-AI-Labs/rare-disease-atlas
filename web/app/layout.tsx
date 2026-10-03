import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Rare Disease Atlas",
  description: "Evidence-backed connections between rare diseases by mechanism and phenotype.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}
        <footer className="mx-auto w-full max-w-3xl px-4 py-8 text-xs text-neutral-500"><b>Not medical advice.</b> Research prototype: computed links are hypotheses, not evidence of shared mechanism. Every claim shows its source.</footer>
      </body>
    </html>
  );
}
