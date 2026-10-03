"use client";
import { useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useStill } from "@/lib/motion";

/** Scene shell: plays once when scrolled into view (each scene ≤ 2.5 s), can be replayed, and shows the static final frame
 *  when the user prefers reduced motion. Children get `run` (a key that changes on replay) and `still` (no motion). */
export function Scene({ label, caption, minH, children }: { label: string; caption?: React.ReactNode; minH: number; children: (run: number, still: boolean) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const still = useStill();
  const [run, setRun] = useState(0);
  return (
    <figure ref={ref} className="scene card relative overflow-hidden p-4 sm:p-6" aria-label={label}>
      <div style={{ minHeight: minH }}>{(seen || still) && <div key={run}>{children(run, still)}</div>}</div>
      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>{caption}</span>
        {!still && <button type="button" onClick={() => setRun((r) => r + 1)} className="more-btn !py-1 !text-xs" aria-label={`Replay: ${label}`}>↻ Replay</button>}
      </figcaption>
    </figure>
  );
}

/** Element size via ResizeObserver (scenes lay out in pixels so dashes and circles never stretch). */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setS({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
}

/** A straight connector drawn with transform only (scaleX from the start point), never with stroke animation. */
export function Connector({ x1, y1, x2, y2, cls, delay, still, pulse, dim, children }:
  { x1: number; y1: number; x2: number; y2: number; cls: string; delay: number; still: boolean; pulse?: boolean; dim?: boolean; children?: React.ReactNode }) {
  const len = Math.hypot(x2 - x1, y2 - y1), ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <div className="pointer-events-none absolute left-0 top-0 transition-opacity" style={{ transform: `translate(${x1}px, ${y1}px) rotate(${ang}deg)`, transformOrigin: "0 0", opacity: dim ? 0.25 : 1 }}>
      <div className={`h-0 origin-left ${cls} ${still ? "" : "scene-draw"} ${pulse && !still ? "scene-pulse" : ""}`}
        style={{ width: len, marginTop: -1, animationDelay: still ? undefined : `${delay}s, ${delay + 0.6}s` }} />
      {children && <div className="absolute" style={{ left: len / 2, top: 0, transform: `translate(-50%, -50%) rotate(${-ang}deg)` }}>{children}</div>}
    </div>
  );
}
