"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { chipOf } from "@/lib/status";

type L = {
  id: string; relation: string; source: string; target: string; evidence_type: string; status: string; confidence: number; source_db: string;
  retrieved_at: string; references?: string[]; ref_titles?: Record<string, string>; quoted_span?: string; population?: string; entailment?: string;
  entailment_rationale?: string; extracted_variant_effect?: string; variant_effect?: string; disease_context?: string; contradicts?: string[];
  note?: string; review_verdict?: string; match_level?: string; shared_phenotypes?: string[]; shared_mechanisms?: string[];
};
type Ctx = { open: (ids: string[], title?: string) => void };
const C = createContext<Ctx>({ open: () => {} });
export const useEvidence = () => useContext(C);

let cache: Promise<Record<string, L>> | null = null;
const loadEdges = () => (cache ??= fetch("/data/edges.json").then((r) => r.json()));

const REL: Record<string, string> = { causes: "causes", has_phenotype: "has the symptom", has_variant_effect: "has variant effect", phenotypically_similar_to: "looks similar (symptoms) to",
  shares_mechanism_with: "may share mechanism with", studied_in: "is a study of", serves: "serves", has_asset: "has asset", authored: "is a lead author of" };
const HOW: Record<string, string> = { curated: "From a curated public database.", manual: "Entered and checked by the team.", llm_extracted: "Read from a paper abstract by an AI, then checked twice (exact words, then whether they say it).",
  computed: "Worked out by a program. This is a hypothesis, not an observation." };
const ENT: Record<string, string> = { yes: "The quote by itself states this.", partial: "The quote only partly supports this.", no: "The quote does not state this effect, so it is kept as context only.",
  not_checked: "The direction of effect is unclear, so this is context only." };
const refUrl = (r: string) => r.startsWith("PMID:") ? `https://pubmed.ncbi.nlm.nih.gov/${r.slice(5)}/` : r.startsWith("NCT") ? `https://clinicaltrials.gov/study/${r}` : r.startsWith("OMIM:") ? `https://omim.org/entry/${r.slice(5)}` : r.startsWith("http") ? r : null;

function EdgeBlock({ e, all }: { e: L; all: Record<string, L> }) {
  const c = chipOf(e);
  const eff = e.relation === "has_variant_effect" ? e.variant_effect?.replace(/_/g, " ") : null;
  return (
    <section className="border-t border-line py-5 first:border-t-0">
      <span className={`chip chip-${c.kind}`}>{c.label}</span>
      <p className="mt-3 font-heading text-lg leading-snug">{e.source} <span className="text-muted">{REL[e.relation] ?? e.relation}</span> {e.target}</p>
      {e.relation === "has_variant_effect" && <p className="mt-1 text-sm text-muted">Disease: {e.disease_context === "unspecified" ? "not specified in the abstract" : e.disease_context}</p>}
      {e.shared_phenotypes && <p className="mt-2 text-sm">Shared symptoms: {e.shared_phenotypes.join("; ")}.</p>}
      {e.shared_mechanisms && <p className="mt-2 text-sm">Shared in papers: {e.shared_mechanisms.map((k) => k.replace(/^[EF]:/, "").replace(/_/g, " ")).join("; ")}.</p>}
      <dl className="mt-3 space-y-3 text-sm">
        <div><dt className="text-muted">How we know</dt><dd>{HOW[e.evidence_type]} <span className="text-muted">Source: {e.source_db}, retrieved {e.retrieved_at}.</span></dd></div>
        {e.quoted_span && (
          <div><dt className="text-muted">Quote from the paper</dt>
            <dd><blockquote className="mt-1 rounded-xl border-l-2 border-accent bg-surface2 px-4 py-3 italic">“{e.quoted_span}”</blockquote>
              {e.entailment && <p className="mt-2"><span className={`chip ${e.entailment === "yes" ? "chip-ok" : e.entailment === "partial" ? "chip-hyp" : "chip-ctx"}`}>
                {e.entailment === "yes" ? "Quote states it" : e.entailment === "partial" ? "Partly" : "Context only"}</span> <span className="ml-1">{ENT[e.entailment]}</span>
                {e.entailment_rationale ? <span className="text-muted"> Checker note: {e.entailment_rationale}</span> : null}</p>}
              {eff && e.extracted_variant_effect && e.extracted_variant_effect.replace(/_/g, " ") !== eff && <p className="mt-1 text-muted">First read as “{e.extracted_variant_effect.replace(/_/g, " ")}”; now “{eff}”.</p>}
              {e.population && <p className="mt-1 text-muted">The quote describes: {e.population.replace(/_/g, " ")}.</p>}
            </dd></div>)}
        <div><dt className="text-muted">Sources</dt>
          <dd>{(e.references ?? []).length ? (e.references ?? []).map((r) => (<span key={r} className="mr-3 inline-block">{refUrl(r) ? <a className="text-accent underline" target="_blank" rel="noreferrer" href={refUrl(r)!}>{r}</a> : r}{e.ref_titles?.[r] ? <span className="block max-w-prose text-muted">{e.ref_titles[r]}</span> : null}</span>)) : "None: this link is computed."}</dd></div>
        <div><dt className="text-muted">Confidence</dt><dd>{e.confidence} <span className="text-muted">({e.evidence_type === "computed" ? "a similarity score, not a probability" : e.evidence_type === "llm_extracted" ? "a rule of thumb from the quote and our checks, not a probability" : "how much we trust this source, a rule of thumb"})</span></dd></div>
        {e.contradicts && e.contradicts.length > 0 && (
          <div><dt className="text-conf">Conflicts with</dt>
            <dd><ul className="mt-1 space-y-2">{e.contradicts.slice(0, 4).map((id) => { const o = all[id]; return o ? (
              <li key={id} className="rounded-xl border border-conf/40 p-3"><span className="italic">“{o.quoted_span}”</span> <a className="text-accent underline" target="_blank" rel="noreferrer" href={refUrl((o.references ?? [])[0] ?? "") ?? "#"}>{(o.references ?? [])[0]}</a> <span className="text-muted">· {o.variant_effect?.replace(/_/g, " ")} · {o.population?.replace(/_/g, " ")}</span></li>) : null; })}</ul>
              <p className="mt-2 text-muted">Needs expert review. Whether the effect depends on age at onset, the exact variant or the lab system is only a hypothesis.</p></dd></div>)}
        {e.note && <div><dt className="text-muted">Note</dt><dd>{e.note}</dd></div>}
        {e.review_verdict && <div><dt className="text-muted">Human review</dt><dd>{e.review_verdict === "correct" ? "✓ Checked by a reviewer: correct" : `Reviewer verdict: ${e.review_verdict}`}</dd></div>}
      </dl>
      <p className="mt-3 text-xs text-muted">Edge {e.id}</p>
    </section>
  );
}

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [title, setTitle] = useState("");
  const [data, setData] = useState<Record<string, L> | null>(null);
  const [err, setErr] = useState(false);
  const from = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = useCallback((i: string[], t?: string) => {
    from.current = document.activeElement as HTMLElement;
    setIds(i); setTitle(t ?? "Evidence");
    loadEdges().then(setData).catch(() => setErr(true));
  }, []);
  const close = useCallback(() => { setIds(null); from.current?.focus(); }, []);
  useEffect(() => {
    if (!ids) return;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") close();
      if (ev.key === "Tab" && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href],button,[tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", key); };
  }, [ids, close]);
  return (
    <C.Provider value={{ open }}>
      {children}
      {ids && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <div className="scrim absolute inset-0 bg-black/60" onClick={close} />
          <div ref={panel} role="dialog" aria-modal="true" aria-label={title} className="drawer relative flex h-full w-full max-w-xl flex-col border-l border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-heading text-xl">{title}</h2>
              <button data-close onClick={close} className="btn btn-ghost !px-4 !py-1.5 text-sm" aria-label="Close evidence panel">Close ✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-10">
              {err && <p className="py-6 text-conf">The evidence details could not be loaded. Check your connection and try again.</p>}
              {!data && !err && <p className="py-6 text-muted">Loading evidence…</p>}
              {data && ids.length > 1 && <p className="pt-4 text-sm text-muted">{ids.length} pieces of evidence behind this.</p>}
              {data && ids.slice(0, 12).map((id) => data[id] ? <EdgeBlock key={id} e={data[id]} all={data} /> : <p key={id} className="py-4 text-muted">Details for {id} are unavailable.</p>)}
              {data && ids.length > 12 && <p className="py-4 text-sm text-muted">…and {ids.length - 12} more edges in the data file.</p>}
              <p className="border-t border-line pt-4 text-xs text-muted">Not medical advice. Computed links are hypotheses.</p>
            </div>
          </div>
        </div>
      )}
    </C.Provider>
  );
}

/** Wrap any chip or card content: opens the evidence drawer for these edge ids. */
export function Ev({ ids, title, children, className = "" }: { ids: string[]; title?: string; children: React.ReactNode; className?: string }) {
  const { open } = useEvidence();
  return <button type="button" aria-haspopup="dialog" onClick={() => open(ids, title)} className={`chip-btn text-left ${className}`}>{children}</button>;
}
