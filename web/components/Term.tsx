import { Tip } from "@/components/Tip";
import { GLOSS_RE, define } from "@/lib/glossary";

/** Glossary tooltip: hover, keyboard focus or tap shows a plain-language definition. */
export function Term({ children, k }: { children: React.ReactNode; k?: string }) {
  const label = typeof children === "string" ? children : k ?? "";
  const def = define(k ?? label);
  if (!def) return <>{children}</>;
  return <Tip content={def} className="dotted">{children}</Tip>;
}

/** Wraps the first occurrence of each glossary term in running text. */
export function Glossed({ text }: { text: string }) {
  const seen = new Set<string>();
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(GLOSS_RE)) {
    const low = m[0].toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(text.slice(last, m.index), <Term key={m.index}>{m[0]}</Term>);
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(text.slice(last));
  return <>{out}</>;
}
