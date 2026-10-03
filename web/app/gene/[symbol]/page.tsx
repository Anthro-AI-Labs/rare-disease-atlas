import Link from "next/link";
import { notFound } from "next/navigation";
import { Claim, Investigators } from "@/components/Claim";
import { Empty } from "@/components/Evidence";
import { diseases, geneClaims, investigatorsForPmids, load, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return load().g.nodes.filter((n) => n.type === "gene").map((n) => ({ symbol: n.name! }));
}

export default async function GenePage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const { g, nodes } = load();
  const gene = nodes.get(`HGNC_SYMBOL:${symbol}`);
  if (!gene) notFound();
  const ds = diseases().filter((d) => d.gene === symbol);
  const claims = geneClaims(gene.id);
  const eff: Record<string, number> = {};
  for (const c of claims) eff[String(c.mech.variant_effect)] = (eff[String(c.mech.variant_effect)] ?? 0) + 1;
  const invs = investigatorsForPmids(claims.map((c) => c.edge.references[0]), 8);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{symbol}</h1>
      <p className="text-sm text-neutral-600">Gene · NCBI Gene {String(gene.ncbi_gene ?? "n/a")}</p>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Diseases in the slice</h2>
      <ul className="mt-2 text-sm">{ds.map((d) => <li key={d.id}><Link className="underline" href={`/disease/${slugOf(d.id)}`}>{d.name}</Link>{d.role === "counterexample" ? " (benign)" : ""}</li>)}</ul>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Mechanism claims</h2>
      {claims.length === 0 ? <Empty>no verified mechanism claims for {symbol}.</Empty> : (<>
        <p className="mt-2 text-sm text-neutral-700">{claims.length} claims. {Object.entries(eff).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.replace(/_/g, " ")} ${n}`).join(" · ")}. Per-disease detail is on the disease pages.</p>
        <ul className="mt-3 space-y-4">{claims.filter((c) => c.mech.variant_effect !== "unclear").slice(0, 3).map((c) => <Claim key={c.edge.id} edge={c.edge} mech={c.mech} pub={c.pub} rule={g.meta.confidence_rule} />)}</ul></>)}
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Researchers on this gene&apos;s literature (also publishing on other genes)</h2>
      <Investigators items={invs} />
    </main>
  );
}
