import Link from "next/link";
import { notFound } from "next/navigation";
import { Claim, Investigators } from "@/components/Claim";
import { load, mechanismKeys, mechanismView, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return mechanismKeys().map((key) => ({ key }));
}

export default async function MechanismPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const v = mechanismView(decodeURIComponent(key));
  if (!v) notFound();
  const rule = load().g.meta.confidence_rule;
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{v.mech.name}</h1>
      <p className="text-sm text-neutral-600">Researcher view: which genes and diseases share this variant effect × molecular function, and who publishes on it under other gene names. {v.n} verified claims.</p>
      <p className="mt-2 text-xs text-neutral-500">Observed in abstracts (LLM-extracted, span verified). Grouping genes by this label is descriptive; it is not evidence that the genes act through one shared mechanism.</p>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Genes and diseases</h2>
      <ul className="mt-2 space-y-6">{v.genes.map((gn) => (
        <li key={gn.gid}>
          <p><Link className="font-medium underline" href={`/gene/${gn.sym}`}>{gn.sym}</Link> <span className="text-sm text-neutral-500">· {gn.edges.length} claims ({gn.edges.filter((e) => e.population === "human").length} human) · {gn.diseases.map((d) => d.name).join("; ")}</span></p>
          <p className="text-sm">{gn.diseases.map((d) => <Link key={d.id} className="mr-3 underline" href={`/disease/${slugOf(d.id)}`}>{d.name}</Link>)}</p>
          <ul className="mt-2 space-y-3">{gn.edges.slice(0, 1).map((e) => <Claim key={e.id} edge={e} mech={v.mech} pub={load().nodes.get(e.references[0])} rule={rule} />)}</ul>
        </li>))}</ul>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Lead authors of these papers who also appear on other genes</h2>
      <Investigators items={v.invs} />
      <p className="mt-2 text-xs text-neutral-500">First/last two authors per PubMed paper. Same name is not the same person: only ORCID or affiliation matches are confirmed; others are labelled “possible match”.</p>
    </main>
  );
}
