import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge, Empty, refLink } from "@/components/Evidence";
import { diseaseView, diseases, idOf, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return diseases().map((d) => ({ slug: slugOf(d.id) }));
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-10 border-b border-neutral-200 pb-1 text-sm font-medium uppercase tracking-wide text-neutral-500">{children}</h2>
);

export default async function DiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = diseaseView(idOf(slug));
  if (!v) notFound();
  const { d, cluster, similar, phenotypes, mechanisms, trials, orgs, assets, causes } = v;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{d.name}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Gene <b>{d.gene}</b> · <a className="underline" target="_blank" rel="noreferrer" href={refLink(d.id)!}>{d.id}</a>
        {d.mondo ? ` · ${d.mondo}` : ""}{d.role === "counterexample" ? " · benign phenotype of a gene that also causes a severe DEE" : ""}
      </p>
      <div className="mt-2"><EvidenceBadge e={causes} /></div>

      <H>Cluster (computed grouping — hypothesis)</H>
      {cluster ? (
        <ul className="mt-2 text-sm">{cluster.members.map((m) => (
          <li key={m.id}>{m.id === d.id ? <b>{m.gene} · {m.name}</b> : <Link className="underline" href={`/disease/${slugOf(m.id)}`}>{m.gene} · {m.name}</Link>}</li>))}</ul>
      ) : <Empty>this disease is not in any cluster.</Empty>}
      <p className="mt-1 text-xs text-neutral-500">Louvain on phenotype similarity only (single seed); mechanism and stability checks arrive in Phase 2.</p>

      <H>Related diseases and why (inferred from phenotypes — hypothesis)</H>
      {similar.length === 0 ? <Empty>no phenotype-similarity edge above the threshold; no supported or inferred link to show.</Empty> : (
        <ul className="mt-2 space-y-4">{similar.map(({ edge, other }) => (
          <li key={edge.id}>
            <Link className="font-medium underline" href={`/disease/${slugOf(other.id)}`}>{other.name}</Link>
            <span className="text-sm text-neutral-500"> · similarity {edge.confidence}</span>
            <p className="mt-1 text-sm text-neutral-700">Shared informative phenotypes: {edge.shared_phenotypes?.slice(0, 5).map((p) => p.name).join("; ") || "none listed"}.</p>
            <div className="mt-1"><EvidenceBadge e={edge} /></div>
          </li>))}</ul>
      )}

      <H>Mechanism claims (from PubMed abstracts)</H>
      {mechanisms.length === 0 ? <Empty>no mechanism claims in the graph for {d.gene} yet (extraction not run or none passed quoted-span verification).</Empty> : (
        <ul className="mt-2 space-y-4">{mechanisms.map(({ edge, mech, pub }) => (
          <li key={edge.id}>
            <p className="font-medium">{mech.name} <span className="text-sm font-normal text-neutral-500">· {edge.population}{edge.linked_phenotype_or_disease ? ` · ${edge.linked_phenotype_or_disease}` : ""}</span></p>
            <blockquote className="mt-1 border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-700">“{edge.quoted_span}”</blockquote>
            <p className="mt-1 text-sm">{pub ? <a className="underline" target="_blank" rel="noreferrer" href={String(pub.url)}>{edge.references[0]}</a> : edge.references[0]}{pub?.name ? ` — ${pub.name}` : ""}</p>
            <div className="mt-1"><EvidenceBadge e={edge} /></div>
          </li>))}</ul>
      )}

      <H>Clinical trials mentioning {d.gene}</H>
      {trials.length === 0 ? <Empty>no ClinicalTrials.gov record names {d.gene} in its title, conditions or keywords.</Empty> : (
        <ul className="mt-2 space-y-3">{trials.map(({ edge, study }) => (
          <li key={edge.id} className="text-sm">
            <a className="font-medium underline" target="_blank" rel="noreferrer" href={String(study.url)}>{study.id}</a> — {study.name}
            <span className="text-neutral-500"> · {String(study.status)}{(study.phases as string[])?.length ? ` · ${(study.phases as string[]).join("/")}` : ""}</span>
            <div className="mt-1"><EvidenceBadge e={edge} /></div>
          </li>))}</ul>
      )}

      <H>Patient groups and shared assets</H>
      {orgs.length + assets.length === 0 ? <Empty>no curated patient groups or assets on file for {d.gene} (data/curated/*.csv is empty or missing).</Empty> : (
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
