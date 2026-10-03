import Link from "next/link";
import { load } from "@/lib/graph";

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold">{children}</h2>;

export default function Methods() {
  const { g } = load();
  const m = g.meta, ms = m.mechanism_stats, en = m.entailment_stats, ro = m.review_overall;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed text-neutral-800">
      <Link href="/" className="text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">Methods &amp; limitations</h1>
      <p className="mt-2 text-neutral-600">Research prototype, built {m.built_at.slice(0, 10)}. Not medical advice. Slice: 8 developmental &amp; epileptic encephalopathy genes, 3 benign same-gene counterexamples, 1 contrast (SCN1A).</p>

      <H>What is observed, what is inferred</H>
      <ul className="mt-2 list-disc pl-5">
        <li><b>Observed · curated:</b> HPO disease–gene–phenotype annotations, ClinicalTrials.gov records, and manually curated patient groups and assets.</li>
        <li><b>Observed · LLM-extracted, span verified:</b> mechanism claims read from PubMed abstracts (below).</li>
        <li><b>Inferred · computed:</b> phenotype similarity, mechanism overlap, clusters and routes between diseases. These are hypotheses, never evidence of shared mechanism.</li>
      </ul>

      <H>Mechanism claims: three checks</H>
      <ol className="mt-2 list-decimal space-y-2 pl-5">
        <li><b>Extraction.</b> An LLM reads one abstract and returns structured claims (variant effect × molecular function, disease context restricted to that gene&apos;s diseases, population) with a quoted span.</li>
        <li><b>Span verification.</b> The quoted span must be an exact substring of the abstract (whitespace-normalised); otherwise the claim is dropped{ms ? ` (${ms.dropped_span} of ${ms.extracted} dropped, ${Math.round((ms.span_drop_rate ?? 0) * 1000) / 10}%; ${ms.verified} kept from ${ms.abstracts} abstracts)` : ""}. This proves the words exist; it does <i>not</i> prove they support the claim.</li>
        <li><b>Entailment check.</b> A second LLM call sees only the gene, the claimed variant effect and the quoted span, and answers whether the span by itself states the effect (yes / partial / no) and which population it describes (human / animal / in vitro / not stated).
          {en ? ` Result: ${en.by_verdict.yes ?? 0} yes, ${en.by_verdict.partial ?? 0} partial, ${en.by_verdict.no ?? 0} no among ${en.checked} directional claims (${en.skipped_unclear} claims were already “unclear” and not checked).` : ""} “No” turns the claim into context only (effect “unclear”); “partial” lowers confidence by 0.2.</li>
      </ol>

      <H>Confidence rule (a heuristic, not a probability)</H>
      <p className="mt-2">{m.confidence_rule}</p>
      <p className="mt-2">Precision is reported per tier from a random manual-review sample (<code>evidence_review_v2.csv</code>): {ro && ro.reviewed > 0 ? `${ro.reviewed} of ${ro.sampled} reviewed so far.` : "no claims have been reviewed yet, so no precision is claimed."} Edges with a reviewer verdict carry a “manually verified” badge.</p>

      <H>Similarity, clusters, conflicts, routes</H>
      <ul className="mt-2 list-disc pl-5">
        <li>Similarity = 0.6 × phenotype (information-content-weighted Jaccard over propagated HPO annotations) + 0.4 × mechanism overlap (weighted Jaccard over variant-effect and molecular-function marginals; needs ≥ {m.cluster_report.min_directional_claims} directional, disease-level claims on both sides, else phenotype only). Weights were fixed in advance, not tuned.</li>
        <li>Clusters: kNN (k = 3) + Louvain, stability = co-assignment over {m.cluster_report.seeds} seeds. A same-gene benign form may share a cluster with its severe form only as “same mechanism, different severity”, which needs the same dominant effect from disease-level evidence; otherwise “uncertain membership”.</li>
        <li>Conflicting evidence: reduced- vs increased-function claims for one disease, each side from ≥ 2 PMIDs. Sides tied to non-overlapping phenotype words are “mixed” (a finding). Conflicts are shown with both sides and are never resolved by us.</li>
        <li>Routes: “supported” needs a curated shared patient group or asset between two diseases; same gene or computed similarity alone is “hypothesis”. With no curated rows no route can be supported.</li>
        <li>Explanations are AI-written from the route&apos;s edges only. Every step must cite edge IDs from that route, no identifier outside the input is allowed, and a step asserting a loss- or gain-of-function effect must cite a claim whose span entails it. Rejected answers are retried once, then replaced by a plain template.{m.explanation_stats ? ` Current set: ${m.explanation_stats.llm} AI-written, ${m.explanation_stats.template_fallback} template; ${m.explanation_stats.first_try_pass} passed on the first try.` : ""}</li>
      </ul>

      <H>What is heuristic or limited</H>
      <ul className="mt-2 list-disc pl-5">
        <li>Only abstracts are read (no full text); claims often name the gene but not the disease, so disease-level evidence is thin, especially for the benign forms (SCN2A and SCN8A have about one directional claim each).</li>
        <li>The span-only entailment check cannot see context, and populations are frequently “not stated”, which lowers confidence by design. Both LLM steps can be wrong; the human review sample is the check on them.</li>
        <li>Confidence tiers, the 0.6/0.4 weights, the ≥ 3 and ≥ 2 PMID thresholds and the phenotype-word test for “mixed” are judgement calls, documented in <code>docs/DECISIONS.md</code>.</li>
        <li>Trials are matched by gene symbol in the registry record and still need a human to confirm disease and variant scope.</li>
        <li>Investigators are lead authors (first and last two) of the papers behind the claims. A same name is not the same person: only ORCID or affiliation matches are confirmed, others are “possible match”.</li>
        <li>NIH RePORTER is not yet searched. Patient groups and assets are only as complete as the curated CSVs ({m.curated_counts.patient_groups} groups, {m.curated_counts.assets} assets loaded).</li>
      </ul>
    </main>
  );
}
