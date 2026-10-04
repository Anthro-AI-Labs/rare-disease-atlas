"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = { type: string; id: string; label: string; aliases: string[]; href: string; sub: string };
const GROUPS: [string, string][] = [
  ["disease", "Diseases"],
  ["gene", "Genes"],
  ["study", "Studies & Registries"],
  ["symptom", "Symptoms"],
  ["mechanism", "Biology (mechanisms)"],
  ["patient_group", "Patient groups"]
];
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

export default function Search({ big = false }: { big?: boolean }) {
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
    return GROUPS.map(([t, label]) => ({ t, label, rows: hits.filter((h) => h.i.type === t).slice(0, 5) }));
  }, [items, nq]);
  const total = res?.reduce((n, g) => n + g.rows.length, 0) ?? 0;
  return (
    <div>
      <label htmlFor="search" className="sr-only">Search a disease, gene or symptom</label>
      <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
        placeholder="Search a disease, gene or symptom, e.g. STXBP1, seizures"
        className={`w-full rounded-full border border-edge bg-surface px-6 text-ink placeholder:text-muted outline-none transition-shadow focus:border-accent focus:shadow-[0_0_28px_-6px_var(--accent)] ${big ? "py-5 text-xl" : "py-3 text-[1rem]"}`} />
      {err && <p className="mt-3 text-sm text-muted">The search index could not be loaded. You can still browse the diseases below.</p>}
      {res && (
        <div className="mt-4 space-y-5" role="region" aria-label="Search results" aria-live="polite">
          {total === 0 && <p className="card p-5 text-muted">Nothing found. We searched {items!.length} entries (diseases and their synonyms, genes, symptoms, mechanisms and patient groups) in the 8-gene slice. Try a gene symbol such as STXBP1.</p>}
          {res.filter((g) => g.rows.length).map((g) => (
            <section key={g.t}><h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{g.label}</h3>
              <ul className="grid gap-2">
                {g.rows.map(({ i }) => {
                  const via = !i._l.includes(nq) ? i.aliases.find((a) => norm(a).includes(nq)) : null;
                  return (<li key={i.id}><Link href={i.href} className="card block px-5 py-3">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4"><span className="font-medium text-ink">{i.label}</span><span className="text-sm text-muted">{i.sub}</span></span>
                    {via && <span className="text-xs text-muted">also known as: {via}</span>}</Link></li>);
                })}
              </ul></section>))}
        </div>
      )}
    </div>
  );
}
