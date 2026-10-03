import Link from "next/link";
import Search from "@/components/Search";
import { diseases, load, slugOf } from "@/lib/graph";

export default function Home() {
  const { g } = load();
  const ds = diseases();
  const items = ds.map((d) => ({ slug: slugOf(d.id), name: d.name!, gene: d.gene, omim: d.id, mondo: d.mondo, role: d.role }));
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Rare Disease Atlas</h1>
      <p className="mt-2 text-neutral-700">
        Connects rare diseases by mechanism and phenotype, with evidence behind every link. Current slice: 8 developmental
        &amp; epileptic encephalopathy genes, three benign same-gene counterexamples and one contrast (SCN1A / Dravet).
      </p>
      <div className="mt-6"><Search items={items} /></div>
      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-neutral-500">Diseases in the slice</h2>
      <ul className="mt-2 columns-1 gap-8 text-sm sm:columns-2">
        {ds.map((d) => (
          <li key={d.id} className="py-0.5"><Link className="underline decoration-neutral-300 hover:decoration-neutral-900" href={`/disease/${slugOf(d.id)}`}>{d.gene}</Link>
            <span className="text-neutral-500"> · {d.name}{d.role === "counterexample" ? " (benign)" : d.role === "contrast" ? " (contrast)" : ""}</span></li>
        ))}
      </ul>
      <h2 className="mt-10 text-sm font-medium uppercase tracking-wide text-neutral-500">How reliable are the extracted claims?</h2>
      <p className="mt-2 text-sm text-neutral-700">Manual review of random samples, reported per confidence tier (never one overall number). {g.meta.confidence_rule}</p>
      <table className="mt-2 w-full text-left text-sm"><thead><tr className="text-xs text-neutral-500"><th>Tier</th><th>Sampled</th><th>Reviewed</th><th>Correct</th><th>Precision</th></tr></thead>
        <tbody>{Object.entries(g.meta.review_precision_by_tier).map(([t, r]) => (
          <tr key={t} className="border-t border-neutral-200"><td className="py-1">{t}</td><td>{r.sampled}</td><td>{r.reviewed}</td><td>{r.correct}</td>
            <td>{r.precision === null ? "not yet reviewed" : `${Math.round(r.precision * 100)}% (${r.correct}/${r.reviewed}${r.partial ? `, ${r.partial} partial` : ""})`}</td></tr>))}</tbody></table>
      <p className="mt-10 text-xs text-neutral-500">Graph built {g.meta.built_at.slice(0, 10)} from {g.meta.sources.map((s) => s.name).join(", ")}.</p>
    </main>
  );
}
