"use client";
import { useState } from "react";
import { setDepth, useDepth, type Depth } from "@/lib/depth";

/** Header switch: Simple ↔ Detailed. */
export function DepthToggle() {
  const d = useDepth();
  const opt = (v: Depth, label: string) => (
    <button type="button" role="radio" aria-checked={d === v} onClick={() => setDepth(v)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${d === v ? "bg-accent text-onfill" : "text-muted hover:text-ink"}`}>{label}</button>
  );
  return (
    <div role="radiogroup" aria-label="How much detail to show" className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
      {opt("simple", "Simple")}{opt("detailed", "Detailed")}
    </div>
  );
}

/** "I'm a family / I'm a researcher": sets the default depth. */
export function Persona() {
  const d = useDepth();
  const btn = (v: Depth, label: string, sub: string) => (
    <button type="button" aria-pressed={d === v} onClick={() => setDepth(v)}
      className={`card hoverable flex-1 px-5 py-3 text-left ${d === v ? "!border-accent" : ""}`}>
      <span className="block font-heading font-semibold">{label}</span><span className="block text-sm text-muted">{sub}</span>
    </button>
  );
  return (
    <div className="flex flex-col gap-3 sm:flex-row" role="group" aria-label="Who are you?">
      {btn("simple", "I'm a family", "A simple visual story first")}
      {btn("detailed", "I'm a researcher", "The map and evidence counts first")}
    </div>
  );
}

/** One expandable block ("Show/Hide <label>"). Open by default in Detailed, closed in Simple; a click always overrides for this block. */
export function More({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  const d = useDepth();
  const [ov, setOv] = useState<boolean | null>(null);
  const open = ov ?? d === "detailed";
  return (
    <div className={`more ${className}`} data-ov={ov === null ? undefined : ov ? "open" : "closed"}>
      <button type="button" aria-expanded={open} onClick={() => setOv(!open)} className="more-btn">
        <span aria-hidden className="more-caret">▸</span>{open ? "Hide" : "Show"} {label}
      </button>
      <div className="more-body">{children}</div>
    </div>
  );
}
