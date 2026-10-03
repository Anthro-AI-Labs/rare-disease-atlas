import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Space_Grotesk } from "next/font/google";
import { EvidenceProvider } from "@/components/EvidenceDrawer";
import "./globals.css";

const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rare Disease Atlas",
  description: "Find connections between rare diseases by biology and symptoms, with the evidence behind every link.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${space.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-base">Skip to content</a>
        <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-4">
          <Link href="/" className="whitespace-nowrap font-heading text-base font-semibold text-ink hover:text-accent sm:text-lg">Rare Disease Atlas</Link>
          <nav aria-label="Main" className="flex gap-4 whitespace-nowrap text-sm text-muted sm:gap-5" >
            <Link className="hover:text-accent" href="/explore">Explore</Link>
            <Link className="hover:text-accent" href="/methods">Methods</Link>
            <Link className="hover:text-accent" href="/10x">10× case</Link>
          </nav>
        </header>
        <EvidenceProvider><div id="main" className="flex-1">{children}</div></EvidenceProvider>
        <footer className="mx-auto w-full max-w-5xl px-5 py-8 text-xs text-muted">
          Not medical advice. A research prototype: links between diseases are hypotheses unless marked supported, and every claim shows its source.
        </footer>
      </body>
    </html>
  );
}
