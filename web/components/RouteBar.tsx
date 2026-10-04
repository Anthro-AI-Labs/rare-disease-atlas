import { OVERALL, SEG, SEG_NAME, SEG_SHORT, type Seg } from "@/lib/status";

type Segments = { own_community: Seg; link: Seg; related_community: Seg; shared_asset: Seg };
const KEYS = ["own_community", "link", "related_community", "shared_asset"] as const;

/** The route label is the WEAKEST of four parts, so it is never rendered without them. */
export function RouteBar({ overall, segments, compact = false, className = "" }: { overall: Seg; segments: Segments; compact?: boolean; className?: string }) {
  const o = OVERALL[overall];
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${className}`}>
      <span className={`chip chip-${o.kind} !whitespace-normal`} title="The overall label is the weakest of the four parts below.">{compact ? "" : "Route: "}{o.label}</span>
      <ul className="flex flex-wrap gap-1.5" aria-label="The four parts of this route">
        {KEYS.map((k) => (
          <li key={k}><span className={`chip chip-${SEG[segments[k]].kind} !whitespace-normal ${compact ? "!px-2 !text-[0.7rem]" : ""}`} title={`${SEG_NAME[k]}: ${SEG[segments[k]].label}`}>
            {compact ? SEG_SHORT[k] : SEG_NAME[k]}: {SEG[segments[k]].label}</span></li>))}
      </ul>
    </div>
  );
}
