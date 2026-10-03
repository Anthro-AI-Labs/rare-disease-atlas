import type { Seg } from "@/lib/story";
import type { Kind } from "@/lib/status";

/** The ONE focal (L1) element of a disease page: a template sentence from graph counts, key nouns underlined in their status colour. */
export function Answer({ segs, tone, note }: { segs: Seg[]; tone: Kind; note?: React.ReactNode }) {
  return (
    <section aria-label="The short answer" className={`card glow-1 tone-${tone} mt-8 p-6 sm:p-8`}>
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">The short answer</p>
      <p className="mt-3 text-[1.35rem] leading-snug sm:text-[1.9rem] sm:leading-snug">
        {segs.map((s, i) => typeof s === "string" ? <span key={i}>{s}</span> : <span key={i} className={`hl tone-${s.k}`}>{s.t}</span>)}
      </p>
      {note && <div className="mt-4 text-sm text-muted">{note}</div>}
    </section>
  );
}
