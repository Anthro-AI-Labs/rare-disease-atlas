"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = { type: string; id: string; label: string; aliases: string[]; href: string; sub: string };
const GROUPS: [string, string][] = [["disease", "Diseases"], ["gene", "Genes"], ["symptom", "Symptoms (HPO)"], ["mechanism", "Mechanisms"], ["patient_group", "Patient groups"]];
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function score(it: Item & { _l: string; _a: string[] }, q: string, toks: string[]) {
  if (it._l === q) return 100;
  if (it._a.includes(q)) return 92;
  if (it._l.startsWith(q)) return 85;
  if (it._a.some((a) => a.startsWith(q))) return 78;
  if (toks.every((t) => it._l.includes(t))) return 65;
  if (it._a.some((a) => toks.every((t) => a.includes(t)))) return 55;
  return 0;
}

export default function Search() {
  const [items, setItems] = useState<(Item & { _l: string; _a: string[] })[] | null>(null);
  const [err, setErr] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch("/data/search.json").then((r) => r.json()).then((d: Item[]) => setItems(d.map((i) => ({ ...i, _l: norm(i.label), _a: i.aliases.map(norm) })))).catch(() => setErr(true));
  }, []);
  const nq = norm(q);
  const res = useMemo(() => {
    if (!items || !nq) return null;
    const toks = nq.split(" ");
    const hits = items.map((i) => ({ i, s: score(i, nq, toks) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    return GROUPS.map(([t, label]) => ({ t, label, rows: hits.filter((h) => h.i.type === t).slice(0, 6) }));
  }, [items, nq]);
  const total = res?.reduce((n, g) => n + g.rows.length, 0) ?? 0;
  return (
    <div>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search diseases, genes, symptoms, mechanisms or patient groups"
        placeholder="Search a disease, gene, symptom, mechanism or patient group, e.g. STXBP1, EIEE4, hypsarrhythmia, gain of function"
        className="w-full rounded border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900" />
      {err && <p className="mt-2 text-sm text-red-800">Search index could not be loaded.</p>}
      {res && (
        <div className="mt-3 space-y-4">
          {total === 0 && <p className="rounded border border-dashed border-neutral-300 p-3 text-sm text-neutral-600">Gap: no match. Searched {items!.length} entries (diseases and their MONDO synonyms, genes, HPO symptom terms and synonyms, mechanisms, curated patient groups) within the 8-gene slice.</p>}
          {res.filter((g) => g.rows.length).map((g) => (
            <section key={g.t}><h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">{g.label}</h3>
              <ul className="mt-1 divide-y divide-neutral-200 rounded border border-neutral-200">
                {g.rows.map(({ i }) => {
                  const via = !i._l.includes(nq) ? i.aliases.find((a) => norm(a).includes(nq)) : null;
                  return (<li key={i.id}><Link href={i.href} className="block p-3 hover:bg-neutral-50">
                    <span className="flex justify-between gap-3"><span>{i.label}</span><span className="shrink-0 text-sm text-neutral-500">{i.sub}</span></span>
                    {via && <span className="text-xs text-neutral-500">matched synonym: {via}</span>}</Link></li>);
                })}
              </ul></section>))}
        </div>
      )}
    </div>
  );
}
