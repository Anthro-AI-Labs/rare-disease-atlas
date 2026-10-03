import type { Kind } from "@/lib/status";

export function Chip({ kind, children, title }: { kind: Kind; children: React.ReactNode; title?: string }) {
  return <span className={`chip chip-${kind}`} title={title}>{children}</span>;
}
