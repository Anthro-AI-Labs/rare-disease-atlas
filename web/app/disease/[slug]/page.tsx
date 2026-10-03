import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge, Empty, refLink } from "@/components/Evidence";
import { Investigators } from "@/components/Claim";
import { ExplanationPanel } from "@/components/Explanation";
import { diseaseView, diseases, idOf, load, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return diseases().map((d) => ({ slug: slugOf(d.id) }));
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-10 border-b border-neutral-200 pb-1 text-sm font-medium uppercase tracking-wide text-neutral-500">{children}</h2>
);
const STATUS_CLS = { supported: "border-emerald-700 text-emerald-800", hypothesis: "border-amber-600 text-amber-800", none: "border-red-700 text-red-800" };
const STATUS_TXT = { supported: "Supported route", hypothesis: "Hypothesis only (computed links)", none: "No supported route" };

export default async function DiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = diseaseView(idOf(slug));
  if (!v) notFound();
  const { g, nodes, edges: edgeMap } = load();
  const { d, cluster, related, phenotypes, mechanisms, geneLevel, mechOtherCount, effectCounts, sole, trials, orgs, assets, causes, pairInfo, findings, gap, invs } = v;
  const rule = g.meta.confidence_rule;
  const Claim = ({ m }: { m: (typeof mechanisms)[number] }) => (
    <li>
      <p className="font-medium">{m.mech.name} <span className="text-sm font-normal text-neutral-500">· {String(m.edge.population)} · {m.edge.disease_context === "unspecified" ? (sole ? "gene-level, attributed to this disease (only one in the slice)" : "gene-level, disease unspecified") : "about this disease"}{m.edge.linked_phenotype_or_disease ? ` · ${m.edge.linked_phenotype_or_disease}` : ""}</span>
        {m.mech.variant_effect === "unclear" && <span className="ml-2 rounded border border-neutral-400 px-1 text-xs font-normal text-neutral-600">direction unclear: context only</span>}
        {m.edge.confidence <= 0.5 && <span title={rule} className="ml-2 rounded border border-red-700 px-1 text-xs font-normal text-red-800">low confidence {m.edge.confidence}</span>}
      </p>
      <blockquote className="mt-1 border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-700">“{m.edge.quoted_span}”</blockquote>
      <p className="mt-1 text-sm">{m.pub ? <a className="underline" target="_blank" rel="noreferrer" href={String(m.pub.url)}>{m.edge.references[0]}</a> : m.edge.references[0]}{m.pub?.name ? ` — ${m.pub.name}` : ""}</p>
      <div className="mt-1"><EvidenceBadge e={m.edge} /></div>
    </li>
  );
  const directional = mechanisms.filter((m) => m.mech.variant_effect !== "unclear");
  const top3 = directional.slice(0, 3);
  const rest = mechanisms.filter((m) => !top3.includes(m));
  const tr3 = trials.slice(0, 3);
  const Trial = ({ t }: { t: (typeof trials)[number] }) => (
    <li className="text-sm">
      <a className="font-medium underline" target="_blank" rel="noreferrer" href={String(t.study.url)}>{t.study.id}</a> — {t.study.name}
      <span className="text-neutral-500"> · {String(t.study.status)}{(t.study.phases as string[])?.length ? ` · ${(t.study.phases as string[]).join("/")}` : ""}</span>
      <div className="mt-1"><EvidenceBadge e={t.edge} /></div>
    </li>
  );
  const trialStatus: Record<string, number> = {};
  for (const t of trials) trialStatus[String(t.study.status)] = (trialStatus[String(t.study.status)] ?? 0) + 1;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{d.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Gene <b>{d.gene}</b> · <a className="underline" target="_blank" rel="noreferrer" href={refLink(d.id)!}>{d.id}</a>
        {d.mondo ? ` · ${d.mondo}` : ""}{d.role === "counterexample" ? " · benign phenotype of a gene that also causes a severe DEE" : ""}
      </p>
      <div className="mt-2"><EvidenceBadge e={causes} /></div>

      <p className="mt-3"><Link href={`/disease/${slug}/action`} className="rounded border border-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-900 hover:text-white">Patient action view →</Link></p>

      <H>Plain-language explanation</H>
      <ExplanationPanel ex={g.explanations[d.id]} />

      <H>Route to a next step</H>
      <p className="mt-2"><span className={`rounded border px-2 py-0.5 text-sm ${STATUS_CLS[gap.route_status]}`}>{STATUS_TXT[gap.route_status]}</span></p>
      <p className="mt-2 text-sm text-neutral-700">{gap.suggested_question}</p>
      {gap.missing.length > 0 && (<><p className="mt-3 text-sm font-medium">Missing evidence</p>
        <ul className="list-disc pl-5 text-sm text-neutral-700">{gap.missing.map((m) => <li key={m}>{m}</li>)}</ul></>)}
      <details className="mt-3 text-sm"><summary className="cursor-pointer underline">Sources searched and counts</summary>
        <table className="mt-2 w-full text-left text-xs"><tbody>{gap.sources.map((s) => (
          <tr key={s.source} className="border-t border-neutral-200 align-top"><td className="py-1 pr-2 font-medium">{s.source}</td>
            <td className="py-1 pr-2">{s.searched ? `${s.count} ${s.unit}` : s.unit}</td><td className="py-1">{s.found !== undefined ? `${s.found} ${s.found_unit}` : ""}</td></tr>))}</tbody></table></details>
      {gap.routes.length > 0 && (<details className="mt-3 text-sm"><summary className="cursor-pointer underline">Candidate routes ({gap.routes.length})</summary>
        <ul className="mt-2 space-y-1">{gap.routes.map((r) => (<li key={r.to}>
          <Link className="underline" href={`/disease/${slugOf(r.to)}`}>{nodes.get(r.to)!.name}</Link> · {r.connection === "same_gene" ? "same gene (curated)" : "computed similarity (hypothesis)"} · {r.leads.trials.length} trials, {r.leads.patient_groups.length} patient groups, {r.leads.assets.length} assets · edges {r.edge_ids.join(", ")}</li>))}</ul></details>)}

      <H>Cluster (computed grouping — hypothesis)</H>
      {cluster ? (
        <ul className="mt-2 text-sm">{cluster.members.map((m) => (
          <li key={m.id}>{m.id === d.id ? <b>{m.gene} · {m.name}</b> : <Link className="underline" href={`/disease/${slugOf(m.id)}`}>{m.gene} · {m.name}</Link>}
            {m.uncertain && <span title={m.uncertain_reason} className="ml-2 rounded border border-amber-600 px-1 text-xs text-amber-800">uncertain membership</span>}
            <span className="text-xs text-neutral-400"> · stability {m.stability}</span></li>))}</ul>
      ) : <Empty>this disease is not in any cluster.</Empty>}
      <p className="mt-1 text-xs text-neutral-500">{g.meta.cluster_report.method}; stability = how often two members co-cluster across {g.meta.cluster_report.seeds} seeds. Pairs without disease-level mechanism evidence use phenotype similarity only. Uncertain members are flagged, not hidden.</p>
      {pairInfo.map((p) => (
        <div key={p.counterexample} className="mt-2 rounded border border-neutral-200 p-2 text-sm">
          <b>Same-gene benign/severe pair ({p.gene}): {p.status}.</b>
          {p.directional_benign < 3 || p.directional_severe < 3 ? <p className="text-amber-800">Insufficient disease-level evidence (finding): {p.directional_benign} directional claim(s) for the benign form, {p.directional_severe} for the severe form; at least 3 each are needed to compare variant effects.</p> : null}
          <p className="text-neutral-600">{p.evidence_note}</p>
        </div>))}

      <H>Related diseases and why</H>
      {related.length === 0 ? <Empty>no related disease above the display threshold; no supported or inferred link to show.</Empty> : (
        <ul className="mt-2 space-y-4">{related.map(({ pair, other, edges }) => (
          <li key={other.id}>
            <Link className="font-medium underline" href={`/disease/${slugOf(other.id)}`}>{other.name}</Link>
            <span className="text-sm text-neutral-500"> · combined similarity {pair.combined} (phenotype {pair.phenotype}{pair.mechanism_available ? `, mechanism ${pair.mechanism}` : ", mechanism n/a: too little disease-level evidence"})</span>
            <p className="mt-1 text-sm text-neutral-700">Shared informative phenotypes: {pair.shared_phenotypes.slice(0, 5).map((p) => p.name).join("; ") || "none listed"}.</p>
            {pair.shared_mechanism_keys.length > 0 && <p className="text-sm text-neutral-700">Shared in claims: {pair.shared_mechanism_keys.map((k) => k.replace(/^[EF]:/, "").replace(/_/g, " ")).join("; ")}.</p>}
            <div className="mt-1 flex flex-wrap gap-2">{edges.map((e) => <EvidenceBadge key={e.id} e={e} />)}</div>
          </li>))}</ul>
      )}

      <H>Mechanism claims (from PubMed abstracts)</H>
      {findings.map((f) => f.kind === "contradicted" ? (
        <div key={f.disease} className="mt-2 rounded border border-red-700 p-3 text-sm">
          <p className="font-medium text-red-800">Conflicting evidence: expert review needed</p>
          <p className="mt-1 text-neutral-700">Claims for this disease point in opposite directions, from different PMIDs, and the quoted phrases are tied to overlapping phenotypes. We do not resolve the conflict.</p>
          <p className="mt-1 text-neutral-700"><b>Hypothesis, not a conclusion:</b> the direction of effect may depend on age at onset, the specific variant, or the experimental system.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{([["Reduced function (loss of function / dominant negative)", f.reduced], ["Increased function (gain of function)", f.increased]] as const).map(([lab, ids]) => (
            <div key={lab}><p className="font-medium">{lab}</p><ul className="mt-1 space-y-2">{ids.slice(0, 4).map((i) => { const e = edgeMap.get(i)!; return (
              <li key={i} className="text-xs"><span className="italic">“{e.quoted_span}”</span> <a className="underline" target="_blank" rel="noreferrer" href={`https://pubmed.ncbi.nlm.nih.gov/${e.references[0].slice(5)}/`}>{e.references[0]}</a> · {String(e.population)} · conf {e.confidence}</li>); })}
              {ids.length > 4 && <li className="text-xs text-neutral-500">…and {ids.length - 4} more claims</li>}</ul></div>))}</div>
        </div>
      ) : (
        <p key={f.disease} className="mt-2 rounded border border-sky-700 p-2 text-sm text-sky-800">Mixed (a finding, not a conflict): {f.reduced.length} reduced-function and {f.increased.length} increased-function claims are tied to different phenotypes.</p>
      ))}
      {mechanisms.length === 0 ? <Empty>no mechanism claims for this disease in the graph{geneLevel.length ? `; ${geneLevel.length} gene-level claims for ${d.gene} are listed below` : ""}.</Empty> : (
        <>
          <p className="mt-2 text-sm text-neutral-700">
            {mechanisms.length} claims. Variant effect: {Object.entries(effectCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.replace(/_/g, " ")} ${n}`).join(" · ")}.
            <span title={rule} className="ml-1 cursor-help underline decoration-dotted">Confidence rule</span>
          </p>
          <p className="text-xs text-neutral-500">{rule}</p>
          {top3.length > 0 && <><p className="mt-3 text-sm font-medium">Top {top3.length} by confidence (directional claims)</p>
            <ul className="mt-2 space-y-4">{top3.map((m) => <Claim key={m.edge.id} m={m} />)}</ul></>}
          {rest.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm underline">All other claims ({rest.length}, incl. “unclear”)</summary>
            <ul className="mt-2 space-y-4">{rest.map((m) => <Claim key={m.edge.id} m={m} />)}</ul></details>}
        </>
      )}
      {geneLevel.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-sm underline">{geneLevel.length} gene-level {d.gene} claims where the abstract names no specific disease</summary>
        <ul className="mt-2 space-y-4">{geneLevel.map((m) => <Claim key={m.edge.id} m={m} />)}</ul></details>}
      {mechOtherCount > 0 && <p className="mt-2 text-xs text-neutral-500">{mechOtherCount} further {d.gene} claim(s) concern other {d.gene}-related diseases and are shown on those pages.</p>}

      <H>Clinical trials mentioning {d.gene}</H>
      {trials.length === 0 ? <Empty>no ClinicalTrials.gov record names {d.gene} in its title, conditions or keywords.</Empty> : (
        <>
          <p className="mt-2 text-sm text-neutral-700">{trials.length} studies: {Object.entries(trialStatus).map(([k, n]) => `${k.toLowerCase().replace(/_/g, " ")} ${n}`).join(" · ")}. Matched by gene symbol; confirm disease and variant scope.</p>
          <ul className="mt-2 space-y-3">{tr3.map((t) => <Trial key={t.edge.id} t={t} />)}</ul>
          {trials.length > 3 && <details className="mt-3"><summary className="cursor-pointer text-sm underline">All other studies ({trials.length - 3})</summary>
            <ul className="mt-2 space-y-3">{trials.slice(3).map((t) => <Trial key={t.edge.id} t={t} />)}</ul></details>}
        </>
      )}

      <H>Researchers on this gene&apos;s literature who also publish on other genes</H>
      <Investigators items={invs} />
      <p className="mt-1 text-xs text-neutral-500">Lead authors (first/last two) of the PubMed papers behind the claims; shared across ≥ 2 genes. Names are not identities: unlabeled matches have an ORCID or affiliation match, the rest are “possible match”.</p>

      <H>Patient groups and shared assets</H>
      {orgs.length + assets.length === 0 ? <Empty>no curated patient groups or assets on file for {d.gene} (data/curated/patient_groups.csv and assets.csv are empty or missing).</Empty> : (
        <ul className="mt-2 space-y-3 text-sm">
          {orgs.map(({ edge, org }) => <li key={edge.id}><a className="font-medium underline" href={String(org.url)}>{org.name}</a> · {String(org.country)} <div className="mt-1"><EvidenceBadge e={edge} /></div></li>)}
          {assets.map(({ edge, asset }) => <li key={edge.id}><b>{asset.name}</b> · {String(asset.asset_type)} <div className="mt-1"><EvidenceBadge e={edge} /></div></li>)}
        </ul>
      )}

      <H>Top phenotypes (HPO, curated)</H>
      <ul className="mt-2 columns-1 text-sm sm:columns-2">{phenotypes.slice(0, 12).map(({ edge, p }) => (
        <li key={edge.id}>{p.name} <span className="text-neutral-400">· {edge.frequency || "freq n/a"} · {String(edge.hpo_evidence)}</span></li>))}</ul>
      <p className="mt-1 text-xs text-neutral-500">{phenotypes.length} annotated phenotypes; ordered by information content (rarer = more informative).</p>
    </main>
  );
}
