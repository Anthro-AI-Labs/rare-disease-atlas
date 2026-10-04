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
      <H>Human review of the claims</H>
      <p className="mt-2"><b>Verdicts were made by two human reviewers (Varduhi, Amin). An AI assistant helped enter results and draft the evidence notes.</b> The first reviewer is Varduhi, the second is Amin; neither verdict, nor the final verdict that settles any disagreement, is ever edited by the pipeline.</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li><b>The sample.</b> 24 claims were drawn at random (8 per confidence tier, fixed seed, all 9 genes) from the claims as they stood after the span and entailment checks.</li>
        <li><b>The rule.</b> Each claim is judged <i>correct</i>, <i>partial</i> or <i>incorrect</i> over three things: the effect (loss or gain of function), the molecular function, and the disease. Judgement uses only the quoted span and its abstract. OMIM &ldquo;DEE&rdquo; numbers are defined by gene, so a claim about &ldquo;DEE and the same gene&rdquo; counts as matching the disease.</li>
        <li><b>What is counted.</b> Only rows marked <code>verified = yes</code> count as human-verified. Precision uses the <code>final_verdict</code>, per confidence tier, and always shows n.</li>
        <li><b>What happens to a verdict.</b> A claim whose final verdict is <i>incorrect</i> is demoted to context only (it no longer counts as evidence of an effect). A <i>partial</i> claim keeps its status and shows the reviewers&rsquo; reason beside it. Both are logged in the decisions file.</li>
      </ul>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[30rem] text-left">
        <thead className="text-xs text-muted"><tr><th className="py-1 pr-3">Confidence tier</th><th className="pr-3">Reviewed</th><th className="pr-3">Correct</th><th className="pr-3">Partial</th><th className="pr-3">Incorrect</th><th>Correct of reviewed</th></tr></thead>
        <tbody>{Object.entries(m.review_precision_by_tier).map(([t, r]) => (
          <tr key={t} className="border-t border-line"><td className="py-1.5 pr-3">{t}</td><td className="pr-3">{r.reviewed}</td><td className="pr-3">{r.correct}</td><td className="pr-3">{r.partial}</td><td className="pr-3">{r.incorrect}</td>
            <td>{r.reviewed ? `${r.correct} of ${r.reviewed} correct${r.partial ? ` (+ ${r.partial} partial)` : ""}` : "not reviewed"}</td></tr>))}</tbody></table></div>
      <p className="mt-2 text-muted">Tier = the confidence the claim had when it was sampled. {ro ? `${ro.reviewed} claims in the precision table.` : ""} Samples this small give wide uncertainty: read them as a first check, not as a measured rate.</p>
      {m.review_agreement && m.review_agreement.n_double_reviewed > 0 && (
        <p className="mt-3"><b>Agreement between the two human reviewers:</b> {m.review_agreement.agree} of {m.review_agreement.n_double_reviewed} first-pass verdicts match ({Math.round((m.review_agreement.percent_agreement ?? 0) * 100)}%, Cohen&rsquo;s κ {m.review_agreement.cohens_kappa}). Measured on the first verdict against the second verdict, before disagreements were settled.</p>)}
      {m.review_demotion_check && m.review_demotion_check.n > 0 && (
        <div className="mt-3"><p><b>Demotion check.</b> {m.review_demotion_check.n} sampled claims had already been demoted to context only by the automatic check, so they are not in the precision table. Reviewers asked whether the demotion was right: <b>{m.review_demotion_check.correct}</b> correct (the demotion was right), <b>{m.review_demotion_check.partial}</b> partial (the direction was implied, so the demotion was conservative), <b>{m.review_demotion_check.incorrect}</b> incorrect (the span states a direction).</p></div>)}
      <p className="mt-3">Unverified curated rows (patient groups, assets) are shown as &ldquo;pending verification&rdquo; and can never make a link or a route &ldquo;supported&rdquo;. The <code>verified</code> column is the only source of truth for them.</p>

      <H>Similarity, clusters, conflicts, routes</H>
      <ul className="mt-2 list-disc pl-5">
        <li>Similarity = 0.6 × phenotype (information-content-weighted Jaccard over propagated HPO annotations) + 0.4 × mechanism overlap (weighted Jaccard over variant-effect and molecular-function marginals; needs ≥ {m.cluster_report.min_directional_claims} directional, disease-level claims on both sides, else phenotype only). Weights were fixed in advance, not tuned. Molecular function is set deterministically by gene (sodium channel for SCN1A/SCN2A/SCN8A; potassium channel for KCNQ2/KCNT1; synaptic vesicle release for STXBP1; synaptic signaling for SYNGAP1; kinase signaling for CDKL5; G protein signaling for GNAO1), while variant effects are extracted from literature.</li>
        <li>Clusters: kNN (k = 3) + Louvain, stability = co-assignment over {m.cluster_report.seeds} seeds. A same-gene benign form may share a cluster with its severe form only as “same mechanism, different severity”, which needs the same dominant effect from disease-level evidence; otherwise “uncertain membership”.</li>
        <li>Conflicting evidence: reduced- vs increased-function claims for one disease, each side from ≥ 2 PMIDs. Sides tied to non-overlapping phenotype words are “mixed” (a finding). Conflicts are shown with both sides and are never resolved by us.</li>
        <li>Routes have four parts: your own community, the link to the related disease, the related community and a shared asset. Each part is supported, pending verification, hypothesis or not on file; the overall label is the weakest part and is always shown with the four.</li>
        <li><b>Shares a study:</b> one curated study with the same identifier covers both genes, has no more than 10 listed conditions (broad registries such as Simons Searchlight are excluded), and its record covers both specific conditions (a severe form is not linked to a benign form, and “neonatal seizures” alone does not mean a benign form). It is supported only if the asset rows of both genes are verified. Same gene or computed similarity alone is a hypothesis.</li>
        <li><b>Recipients:</b> the “To:” line of a message is pre-filled only with a <i>verified</i> patient group of the right gene: your own gene, or the related disease’s gene when the link is a shared study. It is left blank for phenotype-only links, and a group is never suggested across opposite mechanisms (loss vs gain of function).</li>
        <li>Explanations are AI-written from the route&apos;s edges only. Every step must cite edge IDs from that route, no identifier outside the input is allowed, and a step asserting a loss- or gain-of-function effect must cite a claim whose span entails it. Rejected answers are retried once, then replaced by a plain template.{m.explanation_stats ? ` Current set: ${m.explanation_stats.llm} AI-written, ${m.explanation_stats.template_fallback} template; ${m.explanation_stats.first_try_pass} passed on the first try.` : ""}</li>
      </ul>

      <H>What is heuristic or limited</H>
      <ul className="mt-2 list-disc pl-5">
        <li>Only abstracts are read (no full text); claims often name the gene but not the disease, so disease-level evidence is thin, especially for the benign forms (SCN2A and SCN8A have about one directional claim each).</li>
        <li>The span-only entailment check cannot see context, and populations are frequently “not stated”, which lowers confidence by design. Both LLM steps can be wrong; the human review sample is the check on them.</li>
        <li>Confidence tiers, the 0.6/0.4 weights, the ≥ 3 and ≥ 2 PMID thresholds and the phenotype-word test for “mixed” are judgement calls, documented in <code>docs/DECISIONS.md</code>.</li>
        <li><b>Molecular function is assigned from the gene, not from the paper.</b> Each gene has one fixed function (sodium channel for SCN1A, SCN2A and SCN8A; potassium channel for KCNQ2 and KCNT1; and so on), while the variant effect (loss or gain of function) is read from the literature. The function half of the similarity score is therefore a gene-family signal. Reviewers judged the extracted function label, so rows 8, 18 and 20 of the review sample now display a different, gene-derived function than the one they reviewed; their verdicts are unchanged.</li>
        <li>The “opposite mechanisms” rule uses each disease’s dominant variant effect, which needs at least {m.cluster_report.min_directional_claims} directional claims; where that is unknown, a related community may still be listed (never as a recommendation).</li>
        <li>The keyword tags in the reviewers’ reading packet ([LoF], [GoF], [HUMAN]…) are plain string matches, written by code, not judgements.</li>
        <li>Trials are matched by gene symbol in the registry record and still need a human to confirm disease and variant scope.</li>
        <li>Investigators are lead authors (first and last two) of the papers behind the claims. A same name is not the same person: only ORCID or affiliation matches are confirmed, others are “possible match”.</li>
        <li>NIH RePORTER is not yet searched. Patient groups and assets are only as complete as the curated CSVs ({m.curated_counts.patient_groups} groups, {m.curated_counts.assets} assets loaded).</li>
      </ul>
    </main>
  );
}
