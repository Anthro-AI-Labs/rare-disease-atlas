"use client";
import Link from "next/link";
import { useState } from "react";

export type Item = { slug: string; name: string; gene: string; omim: string; mondo?: string | null; role?: string };

export default function Search({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const hits = t
    ? items.filter((i) => [i.name, i.gene, i.omim, i.mondo ?? "", i.role ?? ""].join(" ").toLowerCase().includes(t))
    : [];
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search diseases or genes"
        placeholder="Search a disease or gene, e.g. STXBP1, SCN2A, Dravet, OMIM:612164"
        className="w-full rounded border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900" />
      {t && (
        <ul className="mt-2 divide-y divide-neutral-200 rounded border border-neutral-200">
          {hits.length === 0 && <li className="p-3 text-sm text-neutral-600">No match in the 8-gene slice (searched disease names, gene symbols, OMIM and MONDO ids). Synonym search is planned.</li>}
          {hits.map((h) => (
            <li key={h.slug}><Link href={`/disease/${h.slug}`} className="flex justify-between p-3 hover:bg-neutral-50">
              <span>{h.name}</span><span className="text-sm text-neutral-500">{h.gene}{h.role === "counterexample" ? " · benign counterexample" : ""}</span>
            </Link></li>
          ))}
        </ul>
      )}
    </div>
  );
}
