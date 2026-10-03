import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty } from "@/components/Evidence";
import { idOf, phenotypeIds, phenotypeView, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return phenotypeIds().map((id) => ({ slug: id.replace(":", "_") }));
}

export default async function PhenotypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = phenotypeView(idOf(slug));
  if (!v) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{v.term.label}</h1>
      <p className="text-sm text-neutral-600">HPO symptom {v.term.id}{v.term.aliases.length ? ` · also called: ${v.term.aliases.slice(0, 6).join("; ")}` : ""}</p>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Diseases in the slice with this symptom</h2>
      {v.diseases.length === 0 ? <Empty>no disease in the slice is annotated with this symptom.</Empty> : (
        <ul className="mt-2 space-y-1 text-sm">{v.diseases.map(({ d, direct }) => (
          <li key={d.id}><Link className="underline" href={`/disease/${slugOf(d.id)}`}>{d.gene} · {d.name}</Link>
            <span className="text-neutral-500"> · {direct ? `annotated directly${direct.frequency ? ` (frequency ${direct.frequency})` : ""}` : "annotated through a more specific symptom"}</span></li>))}</ul>)}
      <p className="mt-4 text-xs text-neutral-500">Source: HPO phenotype annotations (curated), propagated up the HPO hierarchy.</p>
    </main>
  );
}
