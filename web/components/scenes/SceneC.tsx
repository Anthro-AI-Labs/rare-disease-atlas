"use client";
import { motion } from "framer-motion";
import { Scene, useSize } from "@/components/scenes/Scene";
import type { Kind } from "@/lib/status";

type Item = { kind: "group" | "registry" | "study"; label: string; url?: string | null; missing?: boolean };
export type ExistsData = { gene: string; tone: Kind; groups: { name: string; url: string | null }[]; registries: { name: string }[];
  studies: { id: string; name: string; url: string }[]; activeCount: number; totalStudies: number; helpUrl: string };

const ICON: Record<Item["kind"], React.ReactNode> = {
  group: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 4-5 3 0 6 2 6 5" />,
  registry: <path d="M7 4h10v17H7zM10 2h4v4h-4zM10 10h4M10 14h4M10 18h2" />,
  study: <path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3M7.5 15h9" />,
};
const NAME: Record<Item["kind"], string> = { group: "Patient group", registry: "Registry or shared asset", study: "Study" };

/** Scene C, "What already exists": found items pop in around the star; missing kinds are hollow dashed outlines with "+". */
export default function SceneC({ data }: { data: ExistsData }) {
  const items: Item[] = [
    ...(data.groups.length ? data.groups.slice(0, 3).map((g) => ({ kind: "group" as const, label: g.name, url: g.url })) : [{ kind: "group" as const, label: "Patient group", missing: true }]),
    ...(data.registries.length ? data.registries.slice(0, 2).map((r) => ({ kind: "registry" as const, label: r.name })) : [{ kind: "registry" as const, label: "Registry", missing: true }]),
    ...data.studies.slice(0, 6).map((s) => ({ kind: "study" as const, label: `${s.id}: ${s.name}`, url: s.url })),
  ];
  const missing = items.filter((i) => i.missing).map((i) => i.label.toLowerCase());
  return (
    <Scene label="What already exists: patient groups, registries and studies" minH={300}
      caption={<>{data.activeCount} active {data.activeCount === 1 ? "study names" : "studies name"} {data.gene} ({data.totalStudies} in total).
        {missing.length > 0 && <> No {missing.join(" or ")} found yet · <a href={data.helpUrl} target="_blank" rel="noreferrer" className="text-accent underline">how you can help</a></>}</>}>
      {(run, still) => <>
        <Ring key={run} data={data} items={items} still={still} />
        <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted" aria-label="Key">
        {(["group", "registry", "study"] as const).map((k) => <li key={k} className="flex items-center gap-1.5"><svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ok">{ICON[k]}</svg>{NAME[k]}{k === "study" ? " (tap to open)" : ""}</li>)}
        <li className="flex items-center gap-1.5"><span aria-hidden className="hollow inline-block h-4 w-4 rounded-full" />Not found yet</li>
      </ul>
      </>}
    </Scene>
  );
}

function Ring({ data, items, still }: { data: ExistsData; items: Item[]; still: boolean }) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const h = 330, cx = w / 2, cy = h / 2 - 6, R0 = 34, r = 26;
  const rx = Math.min(w * 0.38, 230), ry = 122;
  const step = 0.18, n = items.length;
  return (
    <div ref={ref} className="relative w-full" style={{ height: h }}>
      {w > 0 && <>
        <div aria-hidden className="absolute rounded-full border border-dashed border-line" style={{ left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2 }} />
        <motion.div initial={still ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={still ? { duration: 0 } : { duration: 0.4 }}
          className={`star tone-${data.tone} absolute text-sm`} style={{ left: cx - R0, top: cy - R0, width: R0 * 2, height: R0 * 2 }}>{data.gene}</motion.div>
        <ul aria-label="Items found and missing">
          {items.map((it, i) => {
            const a = -Math.PI / 2 + (2 * Math.PI * i) / n, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
            const body = (
              <span className={`grid place-items-center rounded-full ${it.missing ? "hollow" : it.kind === "study" ? "sat tone-ok" : "sat tone-ok"}`} style={{ width: r * 2, height: r * 2 }}>
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{ICON[it.kind]}</svg>
                {it.missing && <span aria-hidden className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-dashed border-muted bg-base text-xs font-bold text-ink">+</span>}
              </span>);
            return (
              <motion.li key={`${it.kind}${i}`} initial={still ? false : { opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }}
                transition={still ? { duration: 0 } : { delay: 0.4 + i * step, type: "spring", stiffness: 380, damping: 18 }}
                className="absolute" style={{ left: x - r, top: y - r }} title={it.missing ? `${NAME[it.kind]}: not found yet` : it.label}>
                {it.url && !it.missing ? <a href={it.url} target="_blank" rel="noreferrer" className="relative block rounded-full" aria-label={`${NAME[it.kind]}: ${it.label}`}>{body}</a>
                  : <span className="relative block" role="img" aria-label={it.missing ? `${NAME[it.kind]}: not found yet` : `${NAME[it.kind]}: ${it.label}`}>{body}</span>}
                {it.missing && <span className="absolute left-1/2 top-full mt-1 w-28 -translate-x-1/2 text-center text-[0.7rem] leading-tight text-muted">{it.label}: not found yet</span>}
              </motion.li>);
          })}
        </ul>
      </>}
    </div>
  );
}
