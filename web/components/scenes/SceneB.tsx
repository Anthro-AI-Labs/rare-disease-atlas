"use client";
import Link from "next/link";
import { CopyMessage } from "@/components/Actions";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Ev } from "@/components/EvidenceDrawer";
import { DiseaseName, GeneName, StatusTip, type DiseaseTipData, type GeneTipData } from "@/components/Names";
import { Connector, Scene, useSize } from "@/components/scenes/Scene";
import type { Kind } from "@/lib/status";

export type SatView = { id: string; gene: string; common: string; status: "supported" | "hypothesis" | "review"; why: string; edgeIds: string[]; href: string;
  dt: DiseaseTipData; gt: GeneTipData; message: string; to: string | null };
export type Center = { gene: string; common: string; tone: Kind; gt: GeneTipData };

const S: Record<SatView["status"], { kind: Kind; label: string; line: string }> = {
  supported: { kind: "ok", label: "Supported link", line: "line-ok" },
  hypothesis: { kind: "hyp", label: "Hypothesis: needs checking", line: "line-hyp" },
  review: { kind: "conf", label: "Expert review needed", line: "line-conf" },
};

/** Scene B, "Who shares your biology": your disease as a star, related diseases around it. Line style = status:
 *  green solid steady glow (supported), amber dashed slow pulse (hypothesis, never solid), pink dotted with "!" (expert review). */
export default function SceneB({ center, sats }: { center: Center; sats: SatView[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const cur = sats.find((s) => s.id === sel);
  return (
    <div>
      <Scene label="Who shares your biology: a picture of related conditions" minH={300}
        caption={sats.length ? `${center.gene}, your condition, is in the middle. Tap a related condition to see why it is linked.` : "No related condition is close enough to show yet."}>
        {(run, still) => <Orbit center={center} sats={sats} sel={sel} onSel={setSel} still={still} key={run} />}
      </Scene>
      <AnimatePresence mode="wait">
        {cur && (
          <motion.div key={cur.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="card mt-4 p-5 sm:p-6" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-heading text-2xl font-semibold"><DiseaseName t={cur.dt} /></p>
                <p className="mt-0.5 text-sm text-muted">{cur.dt.name} · gene <GeneName t={cur.gt} /></p>
              </div>
              <StatusTip kind={S[cur.status].kind}><Ev ids={cur.edgeIds} title={`Evidence: link to ${cur.common}`}>
                <span className={`chip chip-${S[cur.status].kind} cursor-pointer`}>{S[cur.status].label}<span aria-hidden className="ev-n opacity-70">· {cur.edgeIds.length} evidence</span></span></Ev></StatusTip>
            </div>
            <p className="mt-4 text-lg"><b className="font-semibold">Why: </b>{cur.why}</p>
            {cur.status !== "supported" && <p className="mt-1 text-sm text-muted">{cur.status === "review" ? "Sources disagree or the grouping is uncertain, so an expert should look first." : "Worked out by a program from shared symptoms. It is an idea to check, not a finding."}</p>}
            <div className="mt-5 flex flex-wrap items-start gap-3">
              <CopyMessage text={cur.message} label={cur.to ? `Copy a message to ${cur.to}` : "Copy a message to a related community"} />
              <Link href={cur.href} className="btn btn-ghost">Open {cur.gene} page <span aria-hidden>→</span></Link>
            </div>
          </motion.div>)}
      </AnimatePresence>
    </div>
  );
}

function Orbit({ center, sats, sel, onSel, still }: { center: Center; sats: SatView[]; sel: string | null; onSel: (id: string) => void; still: boolean }) {
  const [ref, { w }] = useSize<HTMLDivElement>();
  const sm = w < 520;
  const R0 = sm ? 34 : 48, R = sm ? 25 : 32, lw = sm ? 104 : 140;
  const rx = sm ? w / 2 - lw / 2 + 4 : Math.min(w * 0.34, 260), ry = sm ? 142 : 118;
  // offset by π/n so 12 o'clock stays free for the "your condition" label; then fit the height to what is drawn
  const ang = sats.map((_, i) => -Math.PI / 2 + Math.PI / Math.max(sats.length, 1) + (2 * Math.PI * i) / Math.max(sats.length, 1));
  const top = Math.min(-R0 - (sm ? 8 : 30), ...ang.map((a) => ry * Math.sin(a) - R - 6)), bottom = Math.max(R0 + 8, ...ang.map((a) => ry * Math.sin(a) + R + 34));
  const cx = w / 2, cy = -top + 4, h = bottom - top + 8;
  const pos = ang.map((a) => ({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }));
  const t = (d: number) => (still ? { duration: 0 } : { delay: d, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] as const });
  return (
    <div ref={ref} className="relative w-full" style={{ height: h }}>
      {w > 0 && <>
        {sats.map((s, i) => {
          const p = pos[i], dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
          return (
            <Connector key={s.id} cls={S[s.status].line} x1={cx + ux * (R0 + 4)} y1={cy + uy * (R0 + 4)} x2={p.x - ux * (R + 4)} y2={p.y - uy * (R + 4)}
              delay={0.6 + i * 0.25} still={still} pulse={s.status === "hypothesis"} dim={!!sel && sel !== s.id}>
              {s.status === "review" && <motion.span initial={still ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={t(1.1 + i * 0.25)}
                aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-conf text-xs font-bold text-[#1a0610]">!</motion.span>}
            </Connector>);
        })}
        <motion.div initial={still ? false : { opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={t(0)}
          className={`star tone-${center.tone} absolute`} style={{ left: cx - R0, top: cy - R0, width: R0 * 2, height: R0 * 2, fontSize: sm ? 12 : 15 }}>
          <GeneName t={center.gt}>{center.gene}</GeneName>
        </motion.div>
        {!sm && <p className="absolute text-center text-xs uppercase tracking-widest text-muted" style={{ left: cx - 80, top: cy - R0 - 22, width: 160 }}>your condition</p>}
        {sats.map((s, i) => {
          const p = pos[i], st = S[s.status];
          return (
            <motion.div key={s.id} initial={still ? false : { opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={t(0.35 + i * 0.25)}
              className="absolute flex flex-col items-center" style={{ left: p.x - lw / 2, top: p.y - R, width: lw }}>
              <button type="button" aria-pressed={sel === s.id} onClick={() => onSel(s.id)} className={`sat tone-${st.kind} relative`} style={{ width: R * 2, height: R * 2 }}
                aria-label={`${s.common} (${s.gene}). ${st.label}. Show why.`}>
                {s.gene}
              </button>
              <span className="mt-1 text-center text-[0.72rem] leading-tight text-ink/90 sm:text-xs">{s.common}</span>
            </motion.div>);
        })}
      </>}
    </div>
  );
}
