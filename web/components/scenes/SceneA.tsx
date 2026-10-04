"use client";
import { motion } from "framer-motion";
import { Ev } from "@/components/EvidenceDrawer";
import { FuncIcon } from "@/components/FuncIcon";
import { StatusTip } from "@/components/Names";
import { Scene } from "@/components/scenes/Scene";
import { EFFECT, FUNC } from "@/lib/plain";

type Effect = "loss_of_function" | "gain_of_function" | "mixed" | "neutral";
type Mode = "normal" | Effect;
/** One moving thing: from (x0,y0) to (x1,y1). Shape: dot (ion, messenger), ring (signal pulse), tag (P tag), pill (G-protein part). */
type Part = { x0: number; y0: number; x1: number; y1: number; shape: "dot" | "ring" | "tag" | "pill" };
type Spec = { deco: React.ReactNode; gate?: React.ReactNode; parts: (n: number) => Part[]; n: number };

const W = 260, H = 170, M = 85; // panel size and membrane line
const C = { ink: "var(--ink)", line: "var(--scene-line)", mem: "var(--scene-mem)", acc: "var(--accent)", muted: "var(--muted)" };
const membrane = <><rect x={0} y={M - 8} width={W} height={16} fill={C.mem} /><line x1={0} y1={M - 8} x2={W} y2={M - 8} stroke={C.line} /><line x1={0} y1={M + 8} x2={W} y2={M + 8} stroke={C.line} /></>;
const lbl = (x: number, y: number, t: string) => <text x={x} y={y} fontSize={10} fill={C.muted} textAnchor="middle">{t}</text>;
const spread = (n: number, f: (i: number, t: number) => Part) => Array.from({ length: n }, (_, i) => f(i, n === 1 ? 0.5 : i / (n - 1)));

/** Seven base illustrations, one per molecular_function value of the controlled vocabulary. */
const SPECS: Record<string, Spec> = {
  sodium_channel: { n: 6, deco: <>{membrane}<rect x={112} y={M - 14} width={10} height={28} rx={3} fill={C.line} /><rect x={138} y={M - 14} width={10} height={28} rx={3} fill={C.line} />{lbl(W / 2, 18, "outside the cell")}{lbl(W / 2, H - 6, "inside")}</>,
    gate: <rect x={122} y={M - 3} width={16} height={6} fill={C.acc} opacity={0.5} />,
    parts: (n) => spread(n, (i, t) => ({ x0: 70 + t * 120, y0: 30 + (i % 2) * 10, x1: 120 + t * 20, y1: 130 + (i % 3) * 8, shape: "dot" })) },
  potassium_channel: { n: 6, deco: <>{membrane}<rect x={112} y={M - 14} width={10} height={28} rx={3} fill={C.line} /><rect x={138} y={M - 14} width={10} height={28} rx={3} fill={C.line} />{lbl(W / 2, 18, "outside the cell")}{lbl(W / 2, H - 6, "inside")}</>,
    gate: <rect x={122} y={M - 3} width={16} height={6} fill={C.acc} opacity={0.5} />,
    parts: (n) => spread(n, (i, t) => ({ x0: 120 + t * 20, y0: 135 - (i % 3) * 8, x1: 70 + t * 120, y1: 28 + (i % 2) * 10, shape: "dot" })) },
  synaptic_vesicle_release: { n: 5, deco: <><path d={`M20 ${M - 30} Q130 ${M + 10} 240 ${M - 30}`} fill="none" stroke={C.line} strokeWidth={3} /><path d={`M20 ${H - 20} Q130 ${H - 50} 240 ${H - 20}`} fill="none" stroke={C.line} strokeWidth={3} />
      {[90, 130, 170].map((x) => <rect key={x} x={x - 6} y={H - 52} width={12} height={8} rx={2} fill={C.line} />)}{lbl(W / 2, 14, "sending cell")}{lbl(W / 2, H - 4, "receiving cell")}
      {[70, 110, 150, 190].map((x) => <circle key={x} cx={x} cy={34} r={10} fill="none" stroke={C.line} strokeWidth={2} />)}</>,
    parts: (n) => spread(n, (i, t) => ({ x0: 70 + t * 120, y0: 36, x1: 85 + t * 90, y1: H - 58, shape: "dot" })) },
  synaptic_signaling: { n: 4, deco: <><rect x={6} y={50} width={70} height={70} rx={30} fill={C.mem} stroke={C.line} /><rect x={184} y={50} width={70} height={70} rx={30} fill={C.mem} stroke={C.line} />
      {[70, 85, 100].map((y) => <rect key={y} x={180} y={y - 4} width={8} height={8} rx={2} fill={C.line} />)}{lbl(41, 140, "sender")}{lbl(219, 140, "receiver")}</>,
    parts: (n) => spread(n, (i, t) => ({ x0: 80, y0: 70 + t * 30, x1: 176, y1: 70 + t * 30, shape: "ring" })) },
  kinase_signaling: { n: 5, deco: <><circle cx={60} cy={M} r={26} fill={C.mem} stroke={C.line} />{lbl(60, M + 44, "enzyme")}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={150 + (i % 2) * 50} y={28 + i * 24} width={34} height={16} rx={8} fill={C.mem} stroke={C.line} />)}{lbl(195, H - 4, "proteins it switches on/off")}</>,
    parts: (n) => spread(n, (i) => ({ x0: 84, y0: M, x1: 190 + (i % 2) * 50, y1: 36 + i * 24, shape: "tag" })) },
  g_protein_signaling: { n: 4, deco: <>{membrane}<rect x={60} y={M - 22} width={22} height={44} rx={8} fill={C.line} />{lbl(71, 18, "message arrives")}{lbl(170, H - 4, "relayed inside the cell")}</>,
    parts: (n) => spread(n, (i, t) => ({ x0: 90, y0: M + 18, x1: 150 + t * 80, y1: 110 + (i % 2) * 22, shape: "pill" })) },
  other: { n: 4, deco: <><circle cx={W / 2} cy={M} r={56} fill={C.mem} stroke={C.line} />{lbl(W / 2, H - 4, "a brain cell (simplified)")}</>,
    parts: (n) => spread(n, (i) => { const a = (2 * Math.PI * i) / n; return { x0: W / 2, y0: M, x1: W / 2 + Math.cos(a) * 44, y1: M + Math.sin(a) * 44, shape: "ring" }; }) },
};

/** Effect modifiers: fewer and fainter (loss of function), more and too frequent (gain of function), grey with "?" (mixed / not shown). */
const MOD: Record<Mode, { k: number; reps: number; peak: number; color: string }> = {
  normal: { k: 1, reps: 1, peak: 1, color: C.acc },
  loss_of_function: { k: 0.34, reps: 1, peak: 0.45, color: C.acc },
  gain_of_function: { k: 1.7, reps: 3, peak: 1, color: C.acc },
  mixed: { k: 1, reps: 1, peak: 0.8, color: C.muted },
  neutral: { k: 1, reps: 1, peak: 0.8, color: C.muted },
};

function Shape({ p, color }: { p: Part; color: string }) {
  if (p.shape === "ring") return <circle r={6} fill="none" stroke={color} strokeWidth={2} />;
  if (p.shape === "tag") return <g><circle r={7} fill={color} /><text y={3.5} fontSize={9} fontWeight={700} textAnchor="middle" fill="var(--on-fill)">P</text></g>;
  if (p.shape === "pill") return <rect x={-9} y={-5} width={18} height={10} rx={5} fill={color} />;
  return <circle r={4.5} fill={color} />;
}

function Panel({ spec, mode, title, still }: { spec: Spec; mode: Mode; title: string; still: boolean }) {
  const m = MOD[mode];
  const parts = spec.parts(Math.max(1, Math.round(spec.n * m.k)));
  const dur = 2.2 / m.reps; // whole scene stays within 2.5 s
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-muted">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full rounded-xl bg-surface2/60" aria-hidden>
        {spec.deco}
        {spec.gate && (still ? spec.gate : <motion.g initial={{ opacity: 1 }} animate={{ opacity: mode === "gain_of_function" ? [1, 0.15, 1, 0.15, 1, 0.15, 1, 0.15, 1] : mode === "loss_of_function" ? [1, 0.6, 1] : [1, 0.3, 1] }}
          transition={{ duration: 2.2, ease: "linear" }}>{spec.gate}</motion.g>)}
        {parts.map((p, i) => (
          <motion.g key={i} initial={still ? false : { x: p.x0, y: p.y0, opacity: 0 }} animate={{ x: p.x1, y: p.y1, opacity: m.peak }}
            transition={still ? { duration: 0 } : { duration: dur * 0.75, delay: (i / parts.length) * dur * 0.25, repeat: m.reps - 1, repeatDelay: 0.05, ease: "easeInOut" }}>
            <Shape p={p} color={m.color} />
          </motion.g>))}
        {(mode === "mixed" || mode === "neutral") && <g><circle cx={W - 18} cy={18} r={11} fill={C.muted} /><text x={W - 18} y={22.5} fontSize={13} fontWeight={700} textAnchor="middle" fill="var(--on-fill)">?</text></g>}
      </svg>
    </div>
  );
}

/** Scene A, "What is happening": shows the effect only when a claim whose quote states it supports it (entailment yes); else a neutral version. */
export default function SceneA({ func, effect, gene, edgeIds }: { func: string; effect: Effect; gene: string; edgeIds: string[] }) {
  const spec = SPECS[func] ?? SPECS.other;
  const directional = effect === "loss_of_function" || effect === "gain_of_function";
  return (
    <Scene label={`What is happening: a simplified illustration of ${gene}'s role`} minH={200}
      caption={<span>Simplified illustration. {directional ? `Papers describe that, with this gene change, ${EFFECT[effect].plain}.` : effect === "mixed" ? "Papers disagree or describe different effects for different people, so the change is drawn as a neutral pulse." : "No paper quote we checked states the direction of the change yet, so it is drawn as a neutral pulse."}</span>}>
      {(run, still) => (
        <div key={run}>
          <p className="mb-3 flex items-start gap-2"><FuncIcon f={func} size={22} className="mt-0.5 text-accent" /><span><b>{gene}</b> {FUNC[func].desc}.</span></p>
          <div className="flex gap-3 sm:gap-5">
            <Panel spec={spec} mode="normal" title="Usually" still={still} />
            <Panel spec={spec} mode={effect} title={directional ? `With this change: ${EFFECT[effect].label.toLowerCase()}` : "With this change: unclear"} still={still} />
          </div>
          <p className="mt-3">
            {directional && edgeIds.length > 0
              ? <StatusTip kind="ok"><Ev ids={edgeIds} title="Quotes that state this effect"><span className="chip chip-ok cursor-pointer">Supported · literature<span aria-hidden className="ev-n">· {edgeIds.length} evidence</span></span></Ev></StatusTip>
              : effect === "mixed" && edgeIds.length > 0
                ? <StatusTip kind="conf"><Ev ids={edgeIds} title="Both sides"><span className="chip chip-conf cursor-pointer">Expert review: effects differ<span aria-hidden className="ev-n">· {edgeIds.length} evidence</span></span></Ev></StatusTip>
                : <StatusTip kind="ctx" interactive={false}><span className="chip chip-ctx">Direction not shown yet</span></StatusTip>}
          </p>
        </div>)}
    </Scene>
  );
}
