import Link from "next/link";
import { notFound } from "next/navigation";
import ClusterGraph from "@/components/ClusterGraph";
import { Chip } from "@/components/Chip";
import { Claim, Investigators } from "@/components/Claim";
import { Empty, EvidenceBadge, refLink } from "@/components/Evidence";
import { Ev } from "@/components/EvidenceDrawer";
import { strip } from "@/components/Explanation";
import PairExplain from "@/components/PairExplain";
import StepNav from "@/components/StepNav";
import { Glossed, Term } from "@/components/Term";
import { actionView, diseases, graphData, idOf, load, slugOf } from "@/lib/graph";
import { ROUTE } from "@/lib/status";

export function generateStaticParams() {
  return diseases().map((d) => ({ slug: slugOf(d.id) }));
}

const STEPS = [{ id: "disease", label: "Your disease" }, { id: "shared", label: "Who shares your biology" }, { id: "exists", label: "What already exists" }, { id: "next", label: "Your next step" }];
const Step = ({ id, n, title, sub, children }: { id: string; n: number; title: string; sub?: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-20 pt-14" aria-labelledby={`${id}-h`}>
    <p className="text-sm font-semibold uppercase tracking-widest text-accent">Step {n}</p>
    <h2 id={`${id}-h`} className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h2>
    {sub && <p className="mt-2 max-w-2xl text-muted">{sub}</p>}
    <div className="mt-6">{children}</div>
  </section>
);

export default async function DiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idOf(slug);
  if (!diseases().some((d) => d.id === id)) notFound();
  const a = actionView(id);
  const { g, nodes } = load();
  const { v, gap, rel, communities, assets, review, explanation: ex } = a;
  const { d, cluster, mechanisms, geneLevel, mechOtherCount, effectCounts, sole, trials, phenotypes, pairInfo, findings, invs, causes } = v;
  const rule = g.meta.confidence_rule;
  const { nodes: gn, links: gl } = graphData();
  const route = ROUTE[gap.route_status];
  const recruiting = trials.filter((t) => t.study.status === "RECRUITING");
  const shownTrials = [...recruiting, ...trials.filter((t) => t.study.status !== "RECRUITING")];
  const gapAll = gap.missing;
  const lc = (t: string) => (t.length > 1 && t[1] === t[1].toUpperCase() && t[1] !== t[1].toLowerCase() ? t : t.charAt(0).toLowerCase() + t.slice(1));
  const causesIds = (other: string) => g.edges.filter((e) => e.relation === "causes" && (e.target === id || e.target === other)).map((e) => e.id);
  const directional = mechanisms.filter((m) => m.mech.variant_effect !== "unclear");
  const top3 = [...directional].sort((x, y) => Number(y.edge.entailment === "yes") - Number(x.edge.entailment === "yes") || y.edge.confidence - x.edge.confidence).slice(0, 3);
  const rest = mechanisms.filter((m) => !top3.includes(m));
  const ent = { yes: mechanisms.filter((m) => m.edge.entailment === "yes").length, partial: mechanisms.filter((m) => m.edge.entailment === "partial").length };
  const mechLine = (r: (typeof rel)[number]) => {
    const { here, there } = r.effects;
    if (!here.dominant || !there.dominant) return "Not enough disease-specific papers yet to compare the underlying change in the gene.";
    return here.dominant === there.dominant ? `Papers describe the same kind of change in both (${here.dominant.replace(/_/g, " ")}). That is a hypothesis, not a finding.` : "Papers describe different kinds of change in the two.";
  };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-20">
      <Link href="/" className="mt-2 inline-block text-sm text-muted hover:text-accent">← All diseases</Link>
      <header className="pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip chip-accent">{d.gene}</span>
          <a className="chip chip-ctx" href={refLink(d.id)!} target="_blank" rel="noreferrer">{d.id}</a>
          {d.role === "counterexample" && <Chip kind="ctx">benign form of a gene that also causes a severe disease</Chip>}
          <Ev ids={g.meta.gaps[id].routes.flatMap((r) => r.edge_ids).slice(0, 10).concat([causes.id])} title="Evidence for this route"><span className={`chip chip-${route.kind} cursor-pointer`}>{route.label}</span></Ev>
        </div>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-5xl">{d.name}</h1>
      </header>

      <div className="card mt-8 p-4 sm:p-6">
        <p className="mb-2 text-sm text-muted">Where this disease sits among its neighbours. Select a circle to open it.</p>
        <ClusterGraph nodes={gn} links={gl} focusId={id} height={380} />
      </div>

      <StepNav steps={STEPS} />

      <Step id="disease" n={1} title="Your disease">
        {ex ? (
          <div className="card p-6 sm:p-8">
            <p className="text-xl leading-relaxed sm:text-2xl"><Glossed text={strip(ex.summary_plain)} /></p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted">
              <EvidenceBadge e={causes} label="Gene–disease link" />
              <span>{ex.source === "llm" ? "Written by AI from the evidence on this page; each statement was checked against its sources." : "A plain list of recorded evidence."}</span>
            </div>
          </div>
        ) : <Empty>no summary is available for this disease yet.</Empty>}
      </Step>

      <Step id="shared" n={2} title="Who shares your biology" sub="Diseases that look alike on symptoms and, where papers allow, in the kind of gene change. These links are worked out by a program, so they are hypotheses to discuss, not findings.">
        {rel.length === 0 ? <Empty>no related disease is close enough to show.</Empty> : (
          <ul className="grid gap-5">{rel.map((r) => {
            const c = r.route.connection_status === "supported" ? { kind: "ok" as const, label: "Supported route" } : { kind: "hyp" as const, label: "Hypothesis" };
            return (
              <li key={r.to.id} className="card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/disease/${slugOf(r.to.id)}`} className="font-heading text-2xl font-semibold text-ink hover:text-accent">{diseases().find((x) => x.id === r.to.id)?.gene}</Link>
                    <p className="text-sm text-muted">{r.to.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.route.connection === "same_gene" && <Chip kind="ctx">Same gene</Chip>}
                    <Ev ids={r.route.edge_ids} title={`Evidence: link to ${r.to.name}`}><span className={`chip chip-${c.kind} cursor-pointer`}>{c.label}<span aria-hidden className="opacity-70">· evidence</span></span></Ev>
                  </div>
                </div>
                <p className="mt-4 text-lg"><b className="font-semibold">Why:</b> both involve {r.shared.slice(0, 2).map((p) => lc(p.name)).join(" and ") || "overlapping features"}. {mechLine(r)}</p>
                <details className="mt-3 text-sm text-muted"><summary>What differs</summary>
                  <p className="mt-2"><b className="text-ink">Only in {d.gene}:</b> {r.onlyHere.map((p) => p.name).join("; ") || "nothing listed"}.</p>
                  <p className="mt-1"><b className="text-ink">Only in {diseases().find((x) => x.id === r.to.id)?.gene}:</b> {r.onlyThere.map((p) => p.name).join("; ") || "nothing listed"}.</p></details>
                <PairExplain edgeIds={[...new Set([...r.route.edge_ids, ...causesIds(r.to.id)])]} label={r.to.name!} />
              </li>);
          })}</ul>)}
        {pairInfo.map((p) => (
          <div key={p.counterexample} className="mt-5 rounded-2xl border border-conf/40 bg-conf/5 p-5">
            <p className="font-semibold text-conf">Same gene, mild and severe forms ({p.gene}): {p.status === "uncertain membership" ? "grouping uncertain" : p.status}</p>
            <p className="mt-1 text-sm">{p.directional_benign < 3 || p.directional_severe < 3 ? `Not enough evidence yet: ${p.directional_benign} paper statements about the mild form and ${p.directional_severe} about the severe form (we need at least 3 each to compare). That gap is itself a finding.` : p.evidence_note}</p>
          </div>))}
        {findings.filter((f) => f.kind === "contradicted").map((f) => (
          <div key={f.disease} className="mt-5 rounded-2xl border border-conf/40 bg-conf/5 p-5">
            <p className="font-semibold text-conf">Conflicting evidence: expert review needed</p>
            <p className="mt-1 text-sm">Papers disagree on whether the gene change reduces or increases function. We do not settle it. It may depend on age at onset, the exact variant or the lab system — that is only a guess.</p>
            <p className="mt-2"><Ev ids={[...f.reduced.slice(0, 3), ...f.increased.slice(0, 3)]} title="Both sides of the conflict"><span className="chip chip-conf cursor-pointer">See both sides · evidence</span></Ev></p>
          </div>))}
      </Step>

      <Step id="exists" n={3} title="What already exists" sub="Patient groups, registries and studies that could be useful. Only items with a source are listed.">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card p-5"><h3 className="text-lg font-semibold">Patient groups</h3>
            {communities.length ? <ul className="mt-3 space-y-3">{communities.map(({ org, via, edge }) => (<li key={edge.id}><Link href={`/org/${org.id.slice(4)}`} className="font-medium">{org.name}</Link><span className="block text-sm text-muted">via {via}{org.country ? ` · ${String(org.country)}` : ""}</span><span className="mt-1 inline-block"><EvidenceBadge e={edge} /></span></li>))}</ul>
              : <p className="mt-3 text-sm text-muted">None verified yet for {d.gene} or its neighbours. A route becomes <b className="text-ink">supported</b> when a verified patient group serves this disease and a related one.</p>}</div>
          <div className="card p-5"><h3 className="text-lg font-semibold">Registries and shared assets</h3>
            {assets.length ? <ul className="mt-3 space-y-3">{assets.map(({ asset, via, edge }) => (<li key={edge.id}><span className="font-medium">{asset.name}</span><span className="block text-sm text-muted"><Glossed text={String(asset.asset_type)} /> · via {via}</span><span className="mt-1 inline-block"><EvidenceBadge e={edge} /></span></li>))}</ul>
              : <p className="mt-3 text-sm text-muted">None verified yet. A <Term k="registry">registry</Term>, a <Term k="natural history study">natural history study</Term> or a shared sample collection would count once someone confirms it and adds its source.</p>}</div>
          <div className="card p-5"><h3 className="text-lg font-semibold">Studies naming {d.gene}</h3>
            {shownTrials.length ? (<>
              <p className="mt-1 text-sm text-muted">{trials.length} on ClinicalTrials.gov, {recruiting.length} recruiting. Matched by gene name: please confirm they fit.</p>
              <ul className="mt-3 space-y-3">{shownTrials.slice(0, 3).map((t) => (<li key={t.edge.id}><a className="font-medium" target="_blank" rel="noreferrer" href={String(t.study.url)}>{t.study.name}</a><span className="block text-sm text-muted">{t.study.id} · {String(t.study.status).toLowerCase().replace(/_/g, " ")}</span><span className="mt-1 inline-block"><EvidenceBadge e={t.edge} /></span></li>))}</ul>
              {shownTrials.length > 3 && <details className="mt-3 text-sm"><summary className="text-muted">{shownTrials.length - 3} more</summary><ul className="mt-2 space-y-2">{shownTrials.slice(3).map((t) => (<li key={t.edge.id}><a target="_blank" rel="noreferrer" href={String(t.study.url)}>{t.study.name}</a> <span className="text-muted">· {t.study.id} · {String(t.study.status).toLowerCase().replace(/_/g, " ")}</span></li>))}</ul></details>}
            </>) : <p className="mt-3 text-sm text-muted">No registry record names {d.gene} in its title, conditions or keywords.</p>}</div>
        </div>
      </Step>

      <Step id="next" n={4} title="Your next step">
        {ex ? (
          <div className="card p-6 sm:p-8">
            <p className="text-xl leading-relaxed sm:text-2xl"><Glossed text={strip(ex.next_step.text)} /></p>
            <p className="mt-4"><Ev ids={ex.next_step.edge_ids} title="Evidence for the next step"><span className="chip chip-accent cursor-pointer">{ex.next_step.edge_ids.length} pieces of evidence behind this</span></Ev></p>
            <p className="mt-3 text-sm text-muted">A suggestion to discuss with an expert, not advice.</p>
          </div>
        ) : <Empty>no next step has been generated.</Empty>}
        <div className="mt-6 rounded-2xl border border-conf/40 bg-conf/5 p-6">
          <h3 className="text-xl font-semibold text-conf">Needs <Term k="expert review">expert review</Term></h3>
          {review.length ? <ul className="mt-3 list-disc space-y-1.5 pl-5">{review.map((r) => <li key={r}><Glossed text={r} /></li>)}</ul> : <p className="mt-2 text-muted">Nothing flagged.</p>}
        </div>
        {gapAll.length > 0 && (
          <div className="card mt-6 p-6"><h3 className="text-lg font-semibold">What is missing</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">{gapAll.map((m) => <li key={m}>{m}</li>)}</ul>
            <p className="mt-3 text-sm text-muted">Question to take to an expert: {gap.suggested_question}</p></div>)}
      </Step>

      <section className="mt-16 border-t border-line pt-8">
        <details className="card p-6">
          <summary className="text-xl font-semibold">All the evidence (for researchers and the curious)</summary>
          <div className="mt-6 space-y-10">
            <div>
              <h3 className="text-lg font-semibold">Gene-change claims from papers</h3>
              {mechanisms.length === 0 ? <Empty>no claims for this disease{geneLevel.length ? `; ${geneLevel.length} gene-level claims are listed below` : ""}.</Empty> : (<>
                <p className="mt-2 text-sm text-muted">{mechanisms.length} claims · {Object.entries(effectCounts).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k.replace(/_/g, " ")} ${n}`).join(" · ")}. The quote states the effect in {ent.yes}, partly in {ent.partial}, and the rest are context only.</p>
                <p className="mt-1 text-xs text-muted">{rule}</p>
                {top3.length > 0 && <ul className="mt-4 space-y-5">{top3.map((m) => <Claim key={m.edge.id} edge={m.edge} mech={m.mech} pub={m.pub} rule={rule} />)}</ul>}
                {rest.length > 0 && <details className="mt-4"><summary className="text-sm text-muted">All other claims ({rest.length})</summary><ul className="mt-3 space-y-5">{rest.map((m) => <Claim key={m.edge.id} edge={m.edge} mech={m.mech} pub={m.pub} rule={rule} />)}</ul></details>}
              </>)}
              {geneLevel.length > 0 && <details className="mt-4"><summary className="text-sm text-muted">{geneLevel.length} gene-level claims where the abstract names no specific disease</summary><ul className="mt-3 space-y-5">{geneLevel.map((m) => <Claim key={m.edge.id} edge={m.edge} mech={m.mech} pub={m.pub} rule={rule} />)}</ul></details>}
              {mechOtherCount > 0 && <p className="mt-2 text-xs text-muted">{mechOtherCount} further {d.gene} claims concern its other diseases and appear on those pages.{sole ? "" : " Gene-level claims are not attributed to any one disease here."}</p>}
            </div>
            <div>
              <h3 className="text-lg font-semibold">Group membership</h3>
              {cluster ? <ul className="mt-2 space-y-1 text-sm">{cluster.members.map((m) => (<li key={m.id}>{m.id === id ? <b>{m.gene} · {m.name}</b> : <Link href={`/disease/${slugOf(m.id)}`}>{m.gene} · {m.name}</Link>}{m.uncertain && <span title={m.uncertain_reason} className="ml-2 chip chip-conf">uncertain</span>}<span className="text-muted"> · stability {m.stability}</span></li>))}</ul> : null}
              <p className="mt-2 text-xs text-muted">{g.meta.cluster_report.method}; stability = how often two diseases land together across {g.meta.cluster_report.seeds} runs.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Sources searched</h3>
              <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[32rem] text-left text-sm"><tbody>{gap.sources.map((s) => (<tr key={s.source} className="border-t border-line align-top"><td className="py-2 pr-3 font-medium">{s.source}</td><td className="py-2 pr-3 text-muted">{s.searched ? `${s.count} ${s.unit}` : s.unit}</td><td className="py-2 text-muted">{s.found !== undefined ? `${s.found} ${s.found_unit}` : ""}</td></tr>))}</tbody></table></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Researchers on this gene&apos;s literature</h3>
              <Investigators items={invs} />
              <p className="mt-1 text-xs text-muted">Lead authors who also appear on papers about other genes. A name match alone is only a “possible match”.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Top symptoms (HPO, curated)</h3>
              <ul className="mt-2 columns-1 text-sm sm:columns-2">{phenotypes.slice(0, 12).map(({ edge, p }) => (<li key={edge.id}>{p.name} <span className="text-muted">· {edge.frequency || "frequency n/a"}</span></li>))}</ul>
              <p className="mt-1 text-xs text-muted">{phenotypes.length} annotated symptoms; the rarer ones are listed first. <Link href={`/methods`}>How this works</Link></p>
            </div>
          </div>
        </details>
      </section>
    </main>
  );
}
