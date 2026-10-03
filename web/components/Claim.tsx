import { EvidenceBadge } from "@/components/Evidence";
import type { Edge, Node } from "@/lib/graph";

export function Claim({ edge, mech, pub, rule }: { edge: Edge; mech: Node; pub?: Node; rule: string }) {
  return (
    <li>
      <p className="font-medium">{mech.name} <span className="text-sm font-normal text-neutral-500">· {String(edge.population)} · {edge.disease_context === "unspecified" ? "disease unspecified" : String(edge.disease_context)}</span>
        {mech.variant_effect === "unclear" && <span className="ml-2 rounded border border-neutral-400 px-1 text-xs font-normal text-neutral-600">direction unclear: context only</span>}
        {edge.confidence <= 0.5 && <span title={rule} className="ml-2 rounded border border-red-700 px-1 text-xs font-normal text-red-800">low confidence {edge.confidence}</span>}</p>
      <blockquote className="mt-1 border-l-2 border-neutral-300 pl-3 text-sm italic text-neutral-700">“{edge.quoted_span}”</blockquote>
      <p className="mt-1 text-sm">{pub ? <a className="underline" target="_blank" rel="noreferrer" href={String(pub.url)}>{edge.references[0]}</a> : edge.references[0]}{pub?.name ? ` — ${pub.name}` : ""}</p>
      <div className="mt-1"><EvidenceBadge e={edge} /></div>
    </li>
  );
}

export function Investigators({ items }: { items: { inv: Node; papers: number }[] }) {
  if (!items.length) return <p className="rounded border border-dashed border-neutral-300 p-3 text-sm text-neutral-600">Gap: no lead authors shared across two or more genes were found in the PubMed papers behind these claims.</p>;
  return (
    <ul className="mt-2 space-y-1 text-sm">{items.map(({ inv, papers }) => (
      <li key={inv.id}>{inv.name} <span className="text-neutral-500">· {papers} paper(s) here · genes {(inv.genes as string[]).join(", ")}</span>
        <span className={`ml-2 rounded border px-1 text-xs ${inv.match_level === "possible" ? "border-amber-600 text-amber-800" : "border-emerald-700 text-emerald-800"}`}>
          {inv.match_level === "possible" ? "possible match" : inv.match_level === "orcid" ? "ORCID match" : "affiliation match"}</span></li>))}</ul>
  );
}
