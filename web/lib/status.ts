export type Kind = "ok" | "hyp" | "conf" | "ctx" | "accent";
type E = { relation?: string; evidence_type: string; status: string; entailment?: string | null; match_level?: string | null; human_demoted?: boolean | null; pending_verification?: boolean | null };

/** One place that decides how an edge is labelled: colour = meaning (green supported, amber hypothesis, pink conflict, grey context). */
export function chipOf(e: E): { kind: Kind; label: string } {
  if (e.status === "contradicted") return { kind: "conf", label: "Conflicting evidence" };
  if (e.human_demoted) return { kind: "ctx", label: "Context only (reviewers)" };
  if (e.pending_verification) return { kind: "hyp", label: "Pending verification" };
  if (e.relation === "authored" && e.match_level === "possible") return { kind: "hyp", label: "Possible match" };
  if (e.evidence_type === "manual" && e.status === "hypothesis") return { kind: "hyp", label: "Pending verification" };
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

/** Route = four parts; the overall label is the weakest part and is always shown together with them. */
export type Seg = "supported" | "pending" | "hypothesis" | "missing";
export const SEG: Record<Seg, { kind: Kind; label: string }> = {
  supported: { kind: "ok", label: "Supported" }, pending: { kind: "hyp", label: "Pending verification" },
  hypothesis: { kind: "hyp", label: "Hypothesis" }, missing: { kind: "ctx", label: "Not on file" },
};
export const OVERALL: Record<Seg, { kind: Kind; label: string }> = {
  supported: { kind: "ok", label: "Supported route" }, pending: { kind: "hyp", label: "Pending verification" },
  hypothesis: { kind: "hyp", label: "Hypothesis only" }, missing: { kind: "ctx", label: "Route incomplete" },
};
export const SEG_NAME = { own_community: "Your community", link: "Link to related disease", related_community: "Related community", shared_asset: "Shared asset" } as const;
export const SEG_SHORT = { own_community: "Yours", link: "Link", related_community: "Related", shared_asset: "Asset" } as const;

export function studyStatusBadge(rawStatus: string): { label: string; kind: Kind } {
  const s = (rawStatus || "").toUpperCase().replace(/\s+/g, "_");
  if (s === "RECRUITING") return { label: "Recruiting", kind: "ok" };
  if (s === "NOT_YET_RECRUITING") return { label: "Not yet recruiting", kind: "hyp" };
  if (s === "ACTIVE_NOT_RECRUITING" || s === "ENROLLING_BY_INVITATION" || s === "ACTIVE") return { label: "Active", kind: "ok" };
  if (s === "COMPLETED") return { label: "Completed", kind: "ctx" };
  if (s === "TERMINATED") return { label: "Terminated", kind: "conf" };
  if (s === "WITHDRAWN") return { label: "Withdrawn", kind: "conf" };
  if (s === "SUSPENDED") return { label: "Suspended", kind: "conf" };
  return { label: s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : "Unknown", kind: "ctx" };
}

