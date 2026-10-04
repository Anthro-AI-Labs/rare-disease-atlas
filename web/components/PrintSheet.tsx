import { load } from "@/lib/graph";
import { EFFECT } from "@/lib/plain";
import { answerText, type Story } from "@/lib/story";

const STATUS = { supported: "SUPPORTED", hypothesis: "HYPOTHESIS (computed, needs checking)", review: "EXPERT REVIEW NEEDED" } as const;

/** One-page summary for a doctor. Hidden on screen, shown only when printing. Status is written in words (print may be greyscale). */
export function PrintSheet({ s }: { s: Story }) {
  const { g } = load();
  const refs = (ids: string[]) => [...new Set(ids.flatMap((i) => g.edges.find((e) => e.id === i)?.references ?? []))];
  const effectRefs = refs(s.effectEdges).filter((r) => r.startsWith("PMID:")).slice(0, 4);
  const d = s.d, gap = s.a.gap;
  const qs = [
    s.effect === "loss_of_function" || s.effect === "gain_of_function" ? `Papers describe ${s.effect === "loss_of_function" ? "loss of function" : "gain of function"} for ${d.gene} in this condition. Does that apply to my child's specific variant?` : `Is the kind of ${d.gene} change (less or more protein activity) known for my child's variant?`,
    ...s.linked.slice(0, 2).map((x) => `The Atlas suggests a possible link to ${x.common} (${x.gene}) because of shared symptoms. Is that link meaningful for care or research?`),
    ...(s.active.length ? [`Could my child be in scope for one of the active studies, for example ${s.active[0].id}?`] : []),
    gap.suggested_question,
  ];
  return (
    <article className="print-sheet hidden print:block" aria-hidden>
      <header>
        <p className="ps-kicker">Rare Disease Atlas · summary for a clinician · printed from the research prototype</p>
        <h1>{s.common}</h1>
        <p>{d.name} · {d.id}{d.mondo ? ` · ${d.mondo}` : ""} · gene {d.gene}</p>
      </header>
      <h2>Short answer</h2>
      <p>{answerText(s.answer)}</p>
      <h2>Findings and how sure we are</h2>
      <ul>
        <li><b>SUPPORTED (database):</b> {d.gene} causes {d.name} (OMIM, HPO annotations).</li>
        <li><b>{s.effect === "neutral" ? "NOT SHOWN" : s.effect === "mixed" ? "EXPERT REVIEW NEEDED" : "SUPPORTED (literature)"}:</b> gene change — {EFFECT[s.effect].plain}{effectRefs.length ? ` (${effectRefs.join(", ")})` : ""}.</li>
        {s.sats.map((x) => <li key={x.id}><b>{STATUS[x.status]}:</b> related to {x.common} ({x.name}). {x.why}</li>)}
        <li><b>{s.active.length ? "SUPPORTED (registry)" : "GAP"}:</b> {s.active.length} active of {s.studies.length} studies on ClinicalTrials.gov name {d.gene}; check each one fits.</li>
        <li><b>{s.groups.length ? "SUPPORTED (curated)" : "GAP"}:</b> {s.groups.length ? s.groups.map((x) => x.name).join(", ") : "no patient group or registry is on file yet"}.</li>
      </ul>
      <h2>Questions to ask an expert</h2>
      <ol>{qs.map((q) => <li key={q}>{q}</li>)}</ol>
      <h2>Sources</h2>
      <p className="ps-small">{d.id}; {d.mondo ?? "MONDO"} definition; Human Phenotype Ontology annotations; {effectRefs.join(", ") || "no paper quote states the gene-change direction yet"}; {s.active.slice(0, 5).map((t) => t.id).join(", ") || "no active study"}. Every item has its evidence on the Atlas page for this condition.</p>
      <p className="ps-foot">Not medical advice. Computed links are hypotheses, not evidence of a shared mechanism. Data built {g.meta.built_at?.slice(0, 10)}.</p>
    </article>
  );
}
