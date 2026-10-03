import { load, type Edge } from "@/lib/graph";

const TYPE: Record<string, { label: string; cls: string }> = {
  curated: { label: "observed · curated", cls: "border-emerald-700 text-emerald-800" },
  manual: { label: "observed · manual", cls: "border-emerald-700 text-emerald-800" },
  llm_extracted: { label: "observed · LLM-extracted, span verified", cls: "border-sky-700 text-sky-800" },
  computed: { label: "inferred · computed", cls: "border-amber-600 text-amber-800" },
};

export function refLink(r: string) {
  if (r.startsWith("PMID:")) return `https://pubmed.ncbi.nlm.nih.gov/${r.slice(5)}/`;
  if (r.startsWith("NCT")) return `https://clinicaltrials.gov/study/${r}`;
  if (r.startsWith("OMIM:")) return `https://omim.org/entry/${r.slice(5)}`;
  if (r.startsWith("http")) return r;
  return null;
}

export function EvidenceBadge({ e }: { e: Edge }) {
  const t = TYPE[e.evidence_type];
  return (
    <details className="inline-block align-top text-xs">
      <summary className={`cursor-pointer rounded border px-1.5 py-0.5 ${t.cls}`}>
        {t.label} · {e.status === "contradicted" ? "CONFLICTING EVIDENCE: expert review needed" : e.status}{e.status === "hypothesis" ? " (not evidence of shared mechanism)" : ""} · conf {e.confidence}
      </summary>
      <dl className="mt-1 max-w-xl space-y-0.5 rounded border border-neutral-200 p-2 text-neutral-700">
        {e.relation === "authored" && e.match_level === "possible" && <div className="font-medium text-amber-800">Possible match: same name on papers about different genes; no ORCID or affiliation match, so may be different people.</div>}
        <div><dt className="inline font-medium">Edge </dt><dd className="inline">{e.id} · {e.relation}</dd></div>
        <div><dt className="inline font-medium">Source </dt><dd className="inline">{e.source_db} (retrieved {e.retrieved_at})</dd></div>
        <div><dt className="inline font-medium">References </dt>
          <dd className="inline">{e.references.length ? e.references.map((r, i) => {
            const u = refLink(r);
            return <span key={r}>{i ? ", " : ""}{u ? <a className="underline" href={u} target="_blank" rel="noreferrer">{r}</a> : r}</span>;
          }) : "none"}</dd></div>
        {e.quoted_span && <div><dt className="inline font-medium">Quoted span </dt><dd className="inline italic">“{e.quoted_span}”</dd></div>}
        <div><dt className="inline font-medium">Contradictions </dt>
          <dd className="inline">{e.contradicts?.length ? <ul className="mt-1 list-disc pl-5">{e.contradicts.slice(0, 5).map((id) => {
            const o = load().edges.get(id);
            return <li key={id}>{id}: {o ? `${String(o.target).replace("MECH:", "")} — “${o.quoted_span}” (${o.references[0]})` : "?"}</li>;
          })}{e.contradicts.length > 5 && <li>…and {e.contradicts.length - 5} more</li>}</ul>
            : "none found (disease-level check: opposing effects each backed by ≥2 PMIDs)"}</dd></div>
        {e.status === "contradicted" && <div className="font-medium text-red-800">Conflicting evidence: disease-level claims with opposing variant effects exist from different PMIDs. Expert review needed; onset or variant dependence is only a hypothesis.</div>}
        {e.method_note && <div className="italic">{e.method_note}</div>}
        {e.note && <div className="italic">{e.note}</div>}
      </dl>
    </details>
  );
}

export const confTitle = (rule: string) => rule;

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded border border-dashed border-neutral-300 p-3 text-sm text-neutral-600">Gap: {children}</p>;
}
