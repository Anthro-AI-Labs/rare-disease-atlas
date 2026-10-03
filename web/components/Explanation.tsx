import { Ev } from "@/components/EvidenceDrawer";
import { Glossed } from "@/components/Term";
import type { Explanation } from "@/lib/graph";

export const strip = (t: string) => t.replace(/\s*\[(?:[A-Z][0-9a-f]{5,8}(?:,\s*)?)+\]/g, "");

/** Technical explanation (all steps + uncertainties) with a drawer chip per step. */
export function ExplanationPanel({ ex }: { ex?: Explanation }) {
  if (!ex) return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No explanation generated for this disease yet.</p>;
  return (
    <div>
      <p className="text-sm text-muted">{ex.source === "llm" ? `Written by AI (${ex.model}) from the evidence below; every step cites its evidence and was checked automatically.` : "Template list of recorded evidence (the AI text failed its checks)."} Not medical advice.</p>
      <ol className="mt-3 list-decimal space-y-3 pl-6">{ex.steps.map((s, i) => (
        <li key={i}><Glossed text={strip(s.text)} /> <Ev ids={s.edge_ids} title="Evidence for this step" className="align-baseline"><span className="chip chip-accent cursor-pointer">{s.edge_ids.length} evidence</span></Ev></li>))}</ol>
      <p className="mt-4 font-semibold">What we are unsure about</p>
      <ul className="mt-1 list-disc space-y-1 pl-6 text-muted">{ex.uncertainties.map((u) => <li key={u}><Glossed text={strip(u)} /></li>)}</ul>
    </div>
  );
}
