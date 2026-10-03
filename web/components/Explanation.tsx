import { EvidenceBadge } from "@/components/Evidence";
import { load, type Explanation } from "@/lib/graph";

export const strip = (t: string) => t.replace(/\s*\[(?:[A-Z][0-9a-f]{5,8}(?:,\s*)?)+\]/g, "");

export function ExplanationPanel({ ex }: { ex?: Explanation }) {
  if (!ex) return <p className="mt-2 rounded border border-dashed border-neutral-300 p-3 text-sm text-neutral-600">Gap: no explanation generated for this disease yet.</p>;
  const { edges } = load();
  const Cite = ({ ids }: { ids: string[] }) => (
    <details className="ml-1 inline-block align-top text-xs"><summary className="cursor-pointer text-neutral-500 underline">{ids.length} edge{ids.length > 1 ? "s" : ""}</summary>
      <div className="mt-1 space-y-1">{ids.slice(0, 6).map((i) => edges.get(i) && <div key={i}><EvidenceBadge e={edges.get(i)!} /></div>)}{ids.length > 6 && <div className="text-neutral-500">…and {ids.length - 6} more cited edges</div>}</div></details>
  );
  return (
    <div className="mt-2 text-sm">
      <p className="text-xs text-neutral-500">{ex.source === "llm" ? `AI-generated (${ex.model}) from the edges on this page; every step cites edge IDs that were checked against the route, and no identifiers outside the input are allowed.` : "Template summary (the AI explanation failed validation or was not available): a list of recorded edges, not an interpretation."} Not medical advice.</p>
      <p className="mt-2 text-neutral-800">{strip(ex.summary_plain)}</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-neutral-700">{ex.steps.map((s, i) => <li key={i}>{strip(s.text)}<Cite ids={s.edge_ids} /></li>)}</ol>
      <p className="mt-3 font-medium">What we are unsure about</p>
      <ul className="list-disc pl-5 text-neutral-700">{ex.uncertainties.map((u) => <li key={u}>{strip(u)}</li>)}</ul>
    </div>
  );
}
