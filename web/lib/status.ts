export type Kind = "ok" | "hyp" | "conf" | "ctx" | "accent";
type E = { relation?: string; evidence_type: string; status: string; entailment?: string | null; match_level?: string | null };

/** One place that decides how an edge is labelled: colour = meaning (green supported, amber hypothesis, pink conflict, grey context). */
export function chipOf(e: E): { kind: Kind; label: string } {
  if (e.status === "contradicted") return { kind: "conf", label: "Conflicting evidence" };
  if (e.relation === "authored" && e.match_level === "possible") return { kind: "hyp", label: "Possible match" };
  if (e.evidence_type === "manual" && e.status === "hypothesis") return { kind: "hyp", label: "Not yet verified" };
  if (e.evidence_type === "computed" || e.status === "hypothesis") return { kind: "hyp", label: "Hypothesis" };
  if (e.evidence_type === "llm_extracted") {
    if (e.entailment === "yes") return { kind: "ok", label: "Supported · literature" };
    if (e.entailment === "partial") return { kind: "hyp", label: "Partly supported" };
    return { kind: "ctx", label: "Context only" };
  }
  return { kind: "ok", label: e.evidence_type === "manual" ? "Supported · curated" : "Supported · database" };
}
export const ROUTE: Record<string, { kind: Kind; label: string }> = {
  supported: { kind: "ok", label: "Supported route" },
  hypothesis: { kind: "hyp", label: "Hypothesis only" },
  none: { kind: "ctx", label: "No supported route" },
};
