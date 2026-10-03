/** Mini icon per molecular_function category (controlled vocabulary). Decorative: the text next to it carries the meaning. */
export function FuncIcon({ f, size = 18, className = "" }: { f: string; size?: number; className?: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  const body: Record<string, React.ReactNode> = {
    sodium_channel: <><path d="M2 8h6M16 8h6M2 16h6M16 16h6" {...s} /><path d="M8 5v14M16 5v14" {...s} /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 3v4" {...s} /></>,
    potassium_channel: <><path d="M2 8h6M16 8h6M2 16h6M16 16h6" {...s} /><path d="M8 5v14M16 5v14" {...s} /><circle cx="12" cy="12" r="2" fill="currentColor" /><path d="M12 17v4" {...s} /></>,
    synaptic_vesicle_release: <><path d="M3 15c3 3 15 3 18 0" {...s} /><circle cx="8" cy="8" r="2.5" {...s} /><circle cx="14" cy="6" r="2.5" {...s} /><circle cx="12" cy="13" r="1" fill="currentColor" /></>,
    synaptic_signaling: <><path d="M3 9c3-3 6-3 8 0M13 15c2 3 5 3 8 0" {...s} /><path d="M7 12h10" {...s} strokeDasharray="2 2" /></>,
    kinase_signaling: <><circle cx="10" cy="12" r="5" {...s} /><circle cx="17.5" cy="6.5" r="3" {...s} /><path d="M17 5.5v2.5M17 5.5h1a.8.8 0 0 1 0 1.6h-1" {...s} strokeWidth={1.1} /></>,
    g_protein_signaling: <><path d="M4 5h16" {...s} /><circle cx="8" cy="12" r="2.5" {...s} /><circle cx="13" cy="12" r="2.5" {...s} /><circle cx="10.5" cy="17" r="2.5" {...s} /></>,
    other: <><circle cx="12" cy="12" r="7" {...s} /><circle cx="12" cy="12" r="2" fill="currentColor" /></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={`inline-block shrink-0 align-[-0.2em] ${className}`}>{body[f] ?? body.other}</svg>;
}
