import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceBadge } from "@/components/Evidence";
import { orgSlugs, orgView, slugOf } from "@/lib/graph";

export function generateStaticParams() {
  return orgSlugs().map((slug) => ({ slug }));
}

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = orgView(slug);
  if (!v) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">{v.org.name}</h1>
      <p className="text-sm text-neutral-600">Patient group{v.org.country ? ` · ${String(v.org.country)}` : ""}{v.org.has_registry ? " · has a registry" : ""} · curated (manual) entry</p>
      <p className="mt-2 text-sm">{v.org.url ? <a className="underline" href={String(v.org.url)} target="_blank" rel="noreferrer">{String(v.org.url)}</a> : "No URL recorded."}
        {v.org.registry_url ? <> · <a className="underline" href={String(v.org.registry_url)} target="_blank" rel="noreferrer">registry</a></> : null}</p>
      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">Diseases served</h2>
      <ul className="mt-2 space-y-3 text-sm">{v.serves.map(({ edge, d }) => (<li key={edge.id}><Link className="underline" href={`/disease/${slugOf(d.id)}`}>{d.gene} · {d.name}</Link><div className="mt-1"><EvidenceBadge e={edge} /></div></li>))}</ul>
    </main>
  );
}
