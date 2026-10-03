import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge, Empty } from "@/components/Evidence";
import { strip } from "@/components/Explanation";
import { actionView, diseases, idOf, load, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return diseases().map((d) => ({ slug: slugOf(d.id) }));
}
const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-10 border-b border-neutral-200 pb-1 text-sm font-medium uppercase tracking-wide text-neutral-500">{children}</h2>
);
const CLS = { supported: "border-emerald-700 text-emerald-800", hypothesis: "border-amber-600 text-amber-800", none: "border-red-700 text-red-800" };
const TXT = { supported: "Supported route", hypothesis: "Hypothesis only", none: "No supported route" };

export default async function ActionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = idOf(slug);
  if (!diseases().some((d) => d.id === id)) notFound();
  const a = actionView(id);
  const { g, nodes, edges: edgeMap } = load();
  const { v, gap, rel, communities, assets, review, explanation: ex } = a;
  const recruiting = v.trials.filter((t) => t.study.status === "RECRUITING").slice(0, 3);
  const cmp = (r: (typeof rel)[number]) => {
    const { here, there } = r.effects;
    if (!here.dominant || !there.dominant) return `Insufficient disease-level evidence to compare variant effects (${here.n} vs ${there.n} directional claims; ${g.meta.cluster_report.min_directional_claims} each needed).`;
    return here.dominant === there.dominant ? `Same dominant variant effect in the claims (${here.dominant.replace(/_/g, " ")}): hypothesis of a shared mechanism, not established.` : `Different dominant variant effects: ${here.dominant.replace(/_/g, " ")} here vs ${there.dominant.replace(/_/g, " ")} there.`;
  };
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/disease/${slug}`} className="text-sm text-neutral-500 underline">← {v.d.name}</Link>
      <h1 className="mt-3 text-2xl font-semibold">Patient action view: {v.d.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">For patient-group leaders. Gene {v.d.gene}. <b>Not medical advice.</b> Every item cites its source; gaps are shown, not hidden.</p>
      <p className="mt-2"><span className={`rounded border px-2 py-0.5 text-sm ${CLS[gap.route_status]}`}>{TXT[gap.route_status]}</span></p>

      <H>A sourced next step</H>
      {ex ? (<>
        <p className="mt-2">{strip(ex.next_step.text)}</p>
        <div className="mt-2 space-y-1">{ex.next_step.edge_ids.slice(0, 4).map((i) => edgeMap.get(i) && <div key={i}><EvidenceBadge e={edgeMap.get(i)!} /></div>)}</div>
        <p className="mt-1 text-xs text-neutral-500">{ex.source === "llm" ? "AI-drafted from the cited edges; ids validated." : "Template."} A proposal to discuss with an expert, not a recommendation.</p>
      </>) : <Empty>no next step generated for this disease.</Empty>}
      {recruiting.length > 0 && (<><p className="mt-4 text-sm font-medium">Recruiting studies that name {v.d.gene} (possible contacts)</p>
        <ul className="mt-1 space-y-2 text-sm">{recruiting.map((t) => (<li key={t.edge.id}><a className="underline" target="_blank" rel="noreferrer" href={String(t.study.url)}>{t.study.id}</a> — {t.study.name}<div className="mt-1"><EvidenceBadge e={t.edge} /></div></li>))}</ul></>)}

      <H>Related communities</H>
      {communities.length === 0 ? <Empty>no curated patient group is on file for {v.d.gene} or its related diseases. This section fills in automatically when rows are added to data/curated/patient_groups.csv and the graph is rebuilt{g.meta.curated_skipped?.length ? ` (${g.meta.curated_skipped.length} CSV row(s) were skipped as unusable)` : ""}.</Empty> : (
        <ul className="mt-2 space-y-3 text-sm">{communities.map(({ org, via, edge }) => (<li key={edge.id}>
          <Link className="font-medium underline" href={`/org/${org.id.slice(4)}`}>{org.name}</Link> <span className="text-neutral-500">· via {via}{org.country ? ` · ${String(org.country)}` : ""}{org.has_registry ? " · has a registry" : ""}</span>
          <div className="mt-1"><EvidenceBadge e={edge} /></div></li>))}</ul>)}

      <H>Shareable assets</H>
      {assets.length === 0 ? <Empty>no curated assets (registries, natural-history studies, biobanks, models) for {v.d.gene} or related diseases. Fills in automatically from data/curated/assets.csv.</Empty> : (
        <ul className="mt-2 space-y-3 text-sm">{assets.map(({ asset, via, edge }) => (<li key={edge.id}><b>{asset.name}</b> <span className="text-neutral-500">· {String(asset.asset_type)} · via {via}{asset.asset_status ? ` · ${String(asset.asset_status)}` : ""}</span>
          {asset.url ? <> · <a className="underline" target="_blank" rel="noreferrer" href={String(asset.url)}>source</a></> : null}<div className="mt-1"><EvidenceBadge e={edge} /></div></li>))}</ul>)}

      <H>Related diseases: what is shared and what differs</H>
      {rel.length === 0 ? <Empty>no related disease above the display threshold.</Empty> : (
        <ul className="mt-2 space-y-5">{rel.map((r) => (
          <li key={r.to.id} className="text-sm">
            <Link className="font-medium underline" href={`/disease/${slugOf(r.to.id)}`}>{r.to.name}</Link>
            <span className="text-neutral-500"> · {r.route.connection === "same_gene" ? "same gene (not by itself a shared route)" : r.route.connection === "computed" ? "computed similarity" : r.route.connection.replace(/_/g, " ")} · {r.route.connection_status}</span>
            <p className="mt-1"><b>Shared:</b> {r.shared.map((p) => p.name).join("; ") || "no shared informative phenotype listed"}.</p>
            <p><b>Only in {v.d.gene} disease:</b> {r.onlyHere.map((p) => p.name).join("; ") || "none listed"}.</p>
            <p><b>Only in {r.to.name}:</b> {r.onlyThere.map((p) => p.name).join("; ") || "none listed"}.</p>
            <p><b>Mechanism claims:</b> {cmp(r)}</p>
            <div className="mt-1 flex flex-wrap gap-2">{r.edges.slice(0, 3).map((e) => <EvidenceBadge key={e.id} e={e} />)}</div>
          </li>))}</ul>)}

      <H>Needs expert review</H>
      {review.length === 0 ? <p className="mt-2 text-sm text-neutral-600">No flagged items.</p> : <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">{review.map((r) => <li key={r}>{r}</li>)}</ul>}
      {gap.missing.length > 0 && (<><p className="mt-4 text-sm font-medium">Missing evidence</p><ul className="list-disc pl-5 text-sm text-neutral-700">{gap.missing.map((m) => <li key={m}>{m}</li>)}</ul></>)}
      <p className="mt-6 text-xs text-neutral-500">Nodes in graph: {nodes.size}. Sources and counts are on the <Link className="underline" href={`/disease/${slug}`}>disease page</Link>.</p>
    </main>
  );
}
