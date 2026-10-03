"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { GLink, GNode } from "@/lib/graph";

const W = 860;
const COLOR = { supported: "#4ade80", hypothesis: "#fbbf24", none: "#8b93a7" } as const;

/** Deterministic force layout (no animation, no dependencies): repulsion + link springs + cluster pull. */
function layout(nodes: GNode[], links: GLink[], H: number) {
  const n = nodes.length, idx = new Map(nodes.map((d, i) => [d.id, i]));
  const nc = Math.max(...nodes.map((d) => d.cluster)) + 1;
  const P = nodes.map((d, i) => { const a = (2 * Math.PI * d.cluster) / nc + (i % 7) * 0.35; return { x: W / 2 + Math.cos(a) * 220 + (i % 5) * 9, y: H / 2 + Math.sin(a) * 140 + (i % 3) * 7, vx: 0, vy: 0 }; });
  for (let it = 0; it < 500; it++) {
    const cool = 1 - it / 500;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y; const d = Math.max(Math.hypot(dx, dy), 1);
      const f = (125 * 125) / d / d; dx *= f; dy *= f; P[i].vx += dx; P[i].vy += dy; P[j].vx -= dx; P[j].vy -= dy;
    }
    for (const l of links) {
      const i = idx.get(l.a)!, j = idx.get(l.b)!;
      const dx = P[j].x - P[i].x, dy = P[j].y - P[i].y, d = Math.max(Math.hypot(dx, dy), 1);
      const len = l.kind === "gene" ? 95 : Math.min(190, Math.max(95, 200 - 280 * l.w)), f = 0.06 * (d - len) / d;
      P[i].vx += dx * f; P[i].vy += dy * f; P[j].vx -= dx * f; P[j].vy -= dy * f;
    }
    const cen = Array.from({ length: nc }, (_, c) => { const m = nodes.map((d, i) => [d, i] as const).filter(([d]) => d.cluster === c); return { x: m.reduce((s, [, i]) => s + P[i].x, 0) / (m.length || 1), y: m.reduce((s, [, i]) => s + P[i].y, 0) / (m.length || 1) }; });
    for (let i = 0; i < n; i++) {
      const c = cen[nodes[i].cluster];
      P[i].vx += (c.x - P[i].x) * 0.012 + (W / 2 - P[i].x) * 0.004; P[i].vy += (c.y - P[i].y) * 0.012 + (H / 2 - P[i].y) * 0.006;
      P[i].x += Math.max(-14, Math.min(14, P[i].vx * 0.12)) * cool; P[i].y += Math.max(-14, Math.min(14, P[i].vy * 0.12)) * cool; P[i].vx = P[i].vy = 0;
    }
  }
  const xs = P.map((p) => p.x), ys = P.map((p) => p.y), pad = 70;
  const sx = (W - 2 * pad) / (Math.max(...xs) - Math.min(...xs) || 1), sy = (H - 2 * pad) / (Math.max(...ys) - Math.min(...ys) || 1);
  return P.map((p) => ({ x: Math.round((pad + (p.x - Math.min(...xs)) * sx) * 10) / 10, y: Math.round((pad + (p.y - Math.min(...ys)) * sy) * 10) / 10 }));
}

export default function ClusterGraph({ nodes, links, focusId, height = 460 }: { nodes: GNode[]; links: GLink[]; focusId?: string; height?: number }) {
  const pos = useMemo(() => layout(nodes, links, height), [nodes, links, height]);
  const idx = new Map(nodes.map((d, i) => [d.id, i]));
  const [hov, setHov] = useState<string | null>(focusId ?? null);
  const cur = nodes.find((d) => d.id === hov);
  const near = hov ? new Set(links.filter((l) => l.a === hov || l.b === hov).flatMap((l) => [l.a, l.b])) : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="group" aria-label="Disease similarity graph. Each node is a disease; select one to open it.">
        {links.map((l) => {
          const a = pos[idx.get(l.a)!], b = pos[idx.get(l.b)!];
          const on = !hov || l.a === hov || l.b === hov;
          const col = l.kind === "sup" ? COLOR.supported : l.kind === "hyp" ? COLOR.hypothesis : "#8b93a7";
          return <line key={l.a + l.b} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={l.mech ? 3 : 1.6} strokeDasharray={l.kind === "hyp" ? "6 5" : undefined} opacity={on ? 0.85 : 0.18} />;
        })}
        {nodes.map((d, i) => {
          const p = pos[i], focus = d.id === focusId, act = hov === d.id, dim = near && !near.has(d.id) && hov !== d.id;
          const r = focus ? 30 : 23;
          return (
            <Link key={d.id} href={d.href} onMouseEnter={() => setHov(d.id)} onMouseLeave={() => setHov(focusId ?? null)} onFocus={() => setHov(d.id)} onBlur={() => setHov(focusId ?? null)} aria-label={`${d.gene}: ${d.name}. ${d.route === "none" ? "No supported route" : d.route === "supported" ? "Supported route" : "Hypothesis only"}${d.uncertain ? ", uncertain grouping" : ""}`}>
              <g opacity={dim ? 0.3 : 1} style={{ cursor: "pointer", transition: "opacity .2s" }}>
                {(d.uncertain || d.conflict) && <circle cx={p.x} cy={p.y} r={r + 7} fill="none" stroke="#f472b6" strokeWidth={2} strokeDasharray="3 4" />}
                <circle cx={p.x} cy={p.y} r={r} fill="#182036" stroke={COLOR[d.route]} strokeWidth={focus || act ? 4 : 2.5} strokeDasharray={d.role === "counterexample" ? "4 3" : undefined}
                  style={{ filter: focus || act ? `drop-shadow(0 0 10px ${COLOR[d.route]})` : undefined, transition: "filter .2s, stroke-width .2s" }} />
                <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize={focus ? 13 : 11.5} fontWeight={700} fill="#e6eaf2" style={{ fontFamily: "var(--font-heading)" }}>{d.gene}</text>
                {d.role === "counterexample" && <text x={p.x} y={p.y + r + 15} textAnchor="middle" fontSize={11} fill="#8b93a7">benign form</text>}
              </g>
            </Link>
          );
        })}
      </svg>
      <p className="mt-2 min-h-[3rem] text-sm text-muted" aria-live="polite">
        {cur ? <><b className="text-ink">{cur.gene}</b> · {cur.name}. {cur.route === "none" ? "No supported route." : cur.route === "supported" ? "Supported route." : "Hypothesis only."}{cur.uncertain ? " Grouping uncertain." : ""}{cur.id !== focusId ? " Select to open." : ""}</> : "Hover or focus a disease to see its status. Select to open it."}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="Legend">
        <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.supported }} />supported route</li>
        <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.hypothesis }} />hypothesis only</li>
        <li><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR.none }} />no supported route</li>
        <li><span className="mr-1 inline-block h-0 w-5 border-t-2 border-dashed" style={{ borderColor: COLOR.hypothesis }} />computed link (hypothesis)</li>
        <li><span className="mr-1 inline-block h-0 w-5 border-t-2" style={{ borderColor: "#8b93a7" }} />same gene</li>
        <li><span className="mr-1 inline-block h-3 w-3 rounded-full border-2 border-dashed" style={{ borderColor: "#f472b6" }} />uncertain grouping / conflict</li>
      </ul>
    </div>
  );
}
