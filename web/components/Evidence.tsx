import { Ev } from "@/components/EvidenceDrawer";
import { chipOf } from "@/lib/status";
import type { Edge } from "@/lib/graph";

/** Status chip for one edge; opens the evidence drawer. */
export function EvidenceBadge({ e, label }: { e: Edge; label?: string }) {
  const c = chipOf(e);
  return (
    <Ev ids={[e.id]} title="Evidence" className="rounded-full">
      <span className={`chip chip-${c.kind} cursor-pointer`}>{e.review_verdict === "correct" ? "✓ " : ""}{label ?? c.label}<span aria-hidden className="opacity-70">· evidence</span></span>
    </Ev>
  );
}

const ENT: Record<string, { label: string; kind: string }> = {
  yes: { label: "Quote states it", kind: "ok" }, partial: { label: "Partly", kind: "hyp" },
  no: { label: "Context only", kind: "ctx" }, not_checked: { label: "Context only", kind: "ctx" },
};
export function EntailChip({ e }: { e: Edge }) {
  if (e.relation !== "has_variant_effect" || !e.entailment) return null;
  const t = ENT[e.entailment];
  return <span title={e.entailment_rationale || undefined} className={`chip chip-${t.kind} ml-2`}>{t.label}</span>;
}

export function refLink(r: string) {
  if (r.startsWith("PMID:")) return `https://pubmed.ncbi.nlm.nih.gov/${r.slice(5)}/`;
  if (r.startsWith("NCT")) return `https://clinicaltrials.gov/study/${r}`;
  if (r.startsWith("OMIM:")) return `https://omim.org/entry/${r.slice(5)}`;
  if (r.startsWith("http")) return r;
  return null;
}

export const confTitle = (rule: string) => rule;

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted"><b className="text-ink">Gap · </b>{children}</p>;
}
