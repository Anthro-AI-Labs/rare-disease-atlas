"use client";
import Link from "next/link";
import { drag } from "d3-drag";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FuncIcon } from "@/components/FuncIcon";
import { useSize } from "@/components/scenes/Scene";
import type { GLink } from "@/lib/graph";
import { FUNC } from "@/lib/plain";
import type { MapNode } from "@/lib/story";

const COLOR = { supported: "var(--ok)", hypothesis: "var(--hyp)", none: "var(--ctx)" } as const;
const LINK: Record<GLink["kind"], { stroke: string; dash?: string; label: string }> = {
  sup: { stroke: "var(--ok)", label: "Supported route" },
  hyp: { stroke: "var(--hyp)", dash: "7 5", label: "Hypothesis (computed)" },
  review: { stroke: "var(--conf)", dash: "2 4", label: "Expert review needed" },
  gene: { stroke: "var(--ctx)", label: "Same gene" },
};
const ROUTE = { supported: "Supported route", hypothesis: "Hypothesis only", none: "No supported route" } as const;
type N = MapNode & SimulationNodeDatum & { r: number };
type L = { source: N; target: N; kind: GLink["kind"]; w: number; mech: boolean };

/** Deterministic settle (d3-force seeds positions on a phyllotaxis spiral), so server and client agree on the first frame. */
function settle(input: MapNode[], links: GLink[], focusId: string | undefined, narrow: boolean) {
  const nodes: N[] = input.map((d) => ({ ...d, r: d.id === focusId ? 30 : 24 }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ls: L[] = links.map((l) => ({ source: byId.get(l.a)!, target: byId.get(l.b)!, kind: l.kind, w: l.w, mech: l.mech }));
  const nc = Math.max(...nodes.map((n) => n.cluster)) + 1;
  // cluster anchors on an ellipse shaped like the canvas (wide on desktop, tall on phones)
  const [ax, ay] = narrow ? [30, 250] : [300, 130];
  const cx = (c: number) => Math.cos((2 * Math.PI * c) / nc - Math.PI / 2) * ax, cy = (c: number) => Math.sin((2 * Math.PI * c) / nc - Math.PI / 2) * ay;
  const sim = forceSimulation<N>(nodes)
    .force("link", forceLink<N, L>(ls).distance((l) => (l.kind === "gene" || l.kind === "review" ? 100 : Math.min(230, Math.max(130, 240 - 280 * l.w))))
      .strength((l) => (l.kind === "hyp" ? 0.12 : 0.5)))
    .force("charge", forceManyBody<N>().strength(-900).distanceMax(500))
    // collision covers the circle and the label under it, so labels never overlap
    .force("collide", forceCollide<N>((n) => n.r + (n.role === "counterexample" ? 30 : 18)).strength(1).iterations(3))
    .force("x", forceX<N>((n) => cx(n.cluster)).strength(narrow ? 0.3 : 0.1))
    .force("y", forceY<N>((n) => cy(n.cluster)).strength(narrow ? 0.06 : 0.14))
    .stop();
  for (let i = 0; i < 400; i++) sim.tick();
  return { nodes, links: ls, sim };
}

function fitTransform(nodes: N[], w: number, H: number) {
  const xs = nodes.map((n) => n.x!), ys = nodes.map((n) => n.y!), pad = 46;
  const bw = Math.max(...xs) - Math.min(...xs) + 2 * pad, bh = Math.max(...ys) - Math.min(...ys) + 2 * pad + 20;
  const k = Math.min(w / bw, H / bh, 1.6);
  return zoomIdentity.translate(w / 2 - (k * (Math.min(...xs) + Math.max(...xs))) / 2, H / 2 - (k * (Math.min(...ys) + Math.max(...ys))) / 2).scale(k);
}

export default function ForceMap({ nodes: input, links, focusId, height = 460 }: { nodes: MapNode[]; links: GLink[]; focusId?: string; height?: number }) {
  const [wrap, { w }] = useSize<HTMLDivElement>();
  const narrow = w > 0 && w < 640;
  const { nodes, links: ls, sim } = useMemo(() => settle(input, links, focusId, narrow), [input, links, focusId, narrow]);
  const [, setTick] = useState(0);
  const [hov, setHov] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const zb = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const H = useMemo(() => {
    if (!narrow) return height;
    const xs = nodes.map((n) => n.x!), ys = nodes.map((n) => n.y!);
    return Math.round(Math.min(640, Math.max(380, ((Math.max(...ys) - Math.min(...ys) + 112) * w) / (Math.max(...xs) - Math.min(...xs) + 92))));
  }, [narrow, nodes, w, height]);

  // fit everything into view, then let the user zoom (pinch, ctrl/⌘ + wheel, buttons) and pan (drag the background)
  const fitT = useMemo(() => fitTransform(nodes, w || 860, H), [nodes, w, H]);
  const fit = () => { if (svg.current && zb.current) select(svg.current).call(zb.current.transform, fitTransform(nodes, w || 860, H)); };
  useEffect(() => {
    if (!svg.current || !w) return;
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([0.4, 4])
      .filter((e: Event) => (e.type === "wheel" ? (e as WheelEvent).ctrlKey || (e as WheelEvent).metaKey : e.type.startsWith("touch") ? (e as TouchEvent).touches.length > 1 : !(e as MouseEvent).button))
      .on("zoom", (e) => layer.current?.setAttribute("transform", e.transform.toString()));
    zb.current = z;
    select(svg.current).call(z).call(z.transform, fitT).on("dblclick.zoom", null);
    sim.on("tick", () => setTick((t) => t + 1));
    const dr = drag<SVGGElement, unknown>()
      .on("start", function (e) { const n = nodes[Number(this.dataset.i)]; if (!e.active) sim.alphaTarget(0.25).restart(); n.fx = n.x; n.fy = n.y; })
      .on("drag", function (e) { const n = nodes[Number(this.dataset.i)]; n.fx = e.x; n.fy = e.y; })
      .on("end", function (e) { const n = nodes[Number(this.dataset.i)]; if (!e.active) sim.alphaTarget(0); n.fx = null; n.fy = null; });
    select(layer.current).selectAll<SVGGElement, unknown>("g[data-i]").call(dr);
    return () => { sim.on("tick", null); sim.stop(); };
  }, [w, H, sim, nodes, fitT]);

  const act = hov ?? sel;
  const near = act ? new Set(ls.filter((l) => l.source.id === act || l.target.id === act).flatMap((l) => [l.source.id, l.target.id])) : null;
  const cur = nodes.find((n) => n.id === sel);
  const zoomBy = (k: number) => svg.current && zb.current && select(svg.current).call(zb.current.scaleBy, k);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
      <div ref={wrap} className="relative min-w-0">
        <svg ref={svg} width="100%" height={H} className="block touch-pan-y select-none rounded-xl" role="group"
          aria-label="Map of related diseases. Each circle is a disease. Use Tab to move between diseases and Enter to see a summary.">
          <rect width="100%" height="100%" fill="transparent" />
          <g ref={layer} transform={fitT.toString()}>
            {ls.map((l) => {
              const on = !act || l.source.id === act || l.target.id === act, st = LINK[l.kind];
              return <line key={l.source.id + l.target.id} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y} stroke={st.stroke} strokeWidth={l.mech ? 3 : 2}
                strokeDasharray={st.dash} strokeLinecap="round" opacity={act ? (on ? 0.95 : 0.08) : 0.85} style={{ transition: "opacity .2s" }} />;
            })}
            {nodes.map((d, i) => {
              const focus = d.id === focusId, a = act === d.id, dim = near && !near.has(d.id);
              return (
                <g key={d.id} data-i={i} transform={`translate(${d.x},${d.y})`} opacity={dim ? 0.25 : 1} style={{ cursor: "grab", transition: "opacity .2s" }}
                  tabIndex={0} role="button" aria-pressed={sel === d.id} aria-label={`${d.common}, gene ${d.gene}. ${ROUTE[d.route]}${d.uncertain ? ", uncertain grouping" : ""}. Show summary.`}
                  onPointerEnter={() => setHov(d.id)} onPointerLeave={() => setHov(null)} onFocus={() => setHov(d.id)} onBlur={() => setHov(null)}
                  onClick={() => setSel(d.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(d.id); } }}>
                  {(d.uncertain || d.conflict) && <circle r={d.r + 7} fill="none" stroke="var(--conf)" strokeWidth={2} strokeDasharray="3 4" />}
                  <circle r={d.r} fill="var(--node-fill)" stroke={COLOR[d.route]} strokeWidth={focus || a || sel === d.id ? 4 : 2.5} strokeDasharray={d.role === "counterexample" ? "4 3" : undefined}
                    className={focus || a ? `nglow-${d.route}` : undefined} />
                  {sel === d.id && <circle r={d.r + 4} fill="none" stroke="var(--accent)" strokeWidth={2} />}
                  <text y={4.5} textAnchor="middle" fontSize={narrow ? 13 : focus ? 13 : 12} fontWeight={700} fill="var(--ink)" style={{ fontFamily: "var(--font-heading)", pointerEvents: "none" }}>{d.gene}</text>
                  {d.role === "counterexample" && <text y={d.r + 18} textAnchor="middle" fontSize={narrow ? 15 : 13} fontWeight={600} fill="var(--ink2)" style={{ pointerEvents: "none" }}>benign form</text>}
                </g>);
            })}
          </g>
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-1" aria-label="Zoom">
          <button type="button" onClick={() => zoomBy(1.3)} aria-label="Zoom in" title="Zoom in" className="zbtn">+</button>
          <button type="button" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out" title="Zoom out" className="zbtn">−</button>
          <button type="button" onClick={() => fit()} aria-label="Fit map" title="Fit map" className="zbtn">⟲</button>
        </div>
        <p className="mt-2 text-xs text-muted">Drag a circle to move it, drag the background to pan, pinch or ctrl/⌘ + scroll to zoom.</p>
      </div>
      <aside className="card min-h-[10rem] p-5" aria-live="polite" aria-label="Selected disease">
        {cur ? (<>
          <p className="font-heading text-xl font-semibold leading-snug">{cur.common}</p>
          <p className="mt-0.5 text-sm text-muted">{cur.name}</p>
          <p className="mt-3 flex gap-2 text-sm"><FuncIcon f={cur.func} className="mt-0.5 text-accent" /><span><b>{cur.gene}</b> {FUNC[cur.func].desc}.</span></p>
          <p className="mt-3 text-sm">{cur.summary}</p>
          <p className="mt-3"><span className={`chip chip-${cur.route === "supported" ? "ok" : cur.route === "hypothesis" ? "hyp" : "ctx"}`}>{ROUTE[cur.route]}</span>
            {cur.uncertain && <span className="chip chip-conf ml-2">Grouping uncertain</span>}</p>
          {cur.id !== focusId && <Link href={cur.href} className="btn btn-accent mt-4 !py-2">Open <span aria-hidden>→</span></Link>}
        </>) : <p className="text-sm text-muted">Select a circle to see a plain summary of that disease. Hover or focus one to highlight its links.</p>}
      </aside>
      <Legend />
    </div>
  );
}

/** Legend whose three line styles move the way the scenes do: steady glow (supported), slow pulse (hypothesis), "!" (expert review). */
function Legend() {
  const row = (k: GLink["kind"], extra: React.ReactNode, cls = "") => (
    <li className="flex items-center gap-2">
      <svg width="44" height="14" aria-hidden className={cls}><line x1="2" y1="7" x2="42" y2="7" stroke={LINK[k].stroke} strokeWidth="2.5" strokeDasharray={LINK[k].dash} strokeLinecap="round"
        className={k === "sup" ? "lglow" : undefined} />{extra}</svg>{LINK[k].label}
    </li>);
  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted lg:col-span-2" aria-label="Legend">
      {row("sup", null)}
      {row("hyp", null, "legend-pulse")}
      {row("review", <><circle cx="22" cy="7" r="6" fill="var(--conf)" /><text x="22" y="10.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--on-fill)">!</text></>)}
      {row("gene", null)}
      <li className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-dashed" style={{ borderColor: "var(--conf)" }} />uncertain grouping</li>
      <li className="flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-dashed" style={{ borderColor: "var(--ctx)" }} />benign form (dashed circle)</li>
      <li className="flex items-center gap-2">circle colour = <span style={{ color: COLOR.supported }}>supported</span> / <span style={{ color: COLOR.hypothesis }}>hypothesis only</span> / <span style={{ color: "var(--ink2)" }}>no supported route</span></li>
    </ul>
  );
}
