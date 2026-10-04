import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Inter, Space_Grotesk } from "next/font/google";
import { DepthToggle } from "@/components/Depth";
import { EvidenceProvider } from "@/components/EvidenceDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DEPTH_BOOT } from "@/lib/depth-boot";
import { THEME_BOOT } from "@/lib/theme-boot";
import "./globals.css";

const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["500", "600", "700"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rare Disease Atlas",
  description: "Find connections between rare diseases by biology and symptoms, with the evidence behind every link.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-depth="simple" data-theme="light" suppressHydrationWarning className={`${space.variable} ${inter.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} /></head>
      <body className="flex min-h-full flex-col">
        <Script id="depth-boot" strategy="beforeInteractive">{DEPTH_BOOT}</Script>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-canvas">Skip to content</a>
        <header className="print:hidden mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
          <Link href="/" className="whitespace-nowrap font-heading text-base font-semibold text-ink hover:text-accent sm:text-lg">Rare Disease Atlas</Link>
          <nav aria-label="Main" className="order-3 flex w-full sm:order-2 sm:ml-auto sm:w-auto gap-4 whitespace-nowrap text-sm text-muted sm:gap-5" >
            <Link className="hover:text-accent" href="/explore">Explore</Link>
            <Link className="hover:text-accent" href="/methods">Methods</Link>
            <Link className="hover:text-accent" href="/10x">10× case</Link>
          </nav>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0"><DepthToggle /><ThemeToggle /></div>
        </header>
        <EvidenceProvider><div id="main" className="flex-1">{children}</div></EvidenceProvider>
        <footer className="print:hidden mx-auto w-full max-w-5xl px-5 py-8 text-xs text-muted">
          Not medical advice. A research prototype: links between diseases are hypotheses unless marked supported, and every claim shows its source.
          <span className="ml-1">· <Link className="underline" href="/10x">The 10× case</Link> · <Link className="underline" href="/methods">Methods</Link></span>
        </footer>
      </body>
    </html>
  );
}
