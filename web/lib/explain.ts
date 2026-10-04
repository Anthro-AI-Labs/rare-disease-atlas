import prompt from "./explain-prompt.json";
import { effectAssertions } from "./effects";
import { load, type Edge, type Explanation } from "./graph";

const ID_RE = /\b(PMID:?\s*\d+|NCT\d{8}|OMIM:\d+|HP:\d{7}|MONDO:\d+)\b/g;
const SCHEMA = {
  name: prompt.schema_name, strict: true,
  schema: { type: "object", additionalProperties: false, required: ["summary_plain", "steps", "uncertainties", "next_step"], properties: {
    summary_plain: { type: "string" }, uncertainties: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "object", additionalProperties: false, required: ["text", "edge_ids"], properties: { text: { type: "string" }, edge_ids: { type: "array", items: { type: "string" } } } } },
    next_step: { type: "object", additionalProperties: false, required: ["text", "edge_ids"], properties: { text: { type: "string" }, edge_ids: { type: "array", items: { type: "string" } } } } } },
};
type Raw = Pick<Explanation, "summary_plain" | "steps" | "uncertainties" | "next_step">;

export function summarize(ids: string[]) {
  const { nodes, edges } = load();
  return ids.map((i) => {
    const e = edges.get(i)!;
    return { id: i, relation: e.relation, source: nodes.get(e.source)?.name, target: nodes.get(e.target)?.name, evidence_type: e.evidence_type, status: e.status,
      confidence: e.confidence, references: e.references, quoted_span: e.quoted_span, population: e.population, disease_context: e.disease_context,
      span_entails_effect: e.entailment, claimed_variant_effect: nodes.get(e.target)?.variant_effect,
      note: e.method_note ?? e.note ?? undefined };
  });
}

/** Mirror of pipeline/spans.py STYLE_RE: readers never see "the graph" or its jargon. */
const STYLE_RE = /\b(?:the (?:knowledge )?graph|graph|edges?|nodes?)\b/gi;

export function validate(x: Raw, ids: string[]): string[] {
  const { edges } = load();
  const allowed = new Set(ids), refs = new Set<string>();
  for (const i of ids) { const e = edges.get(i) as Edge; e.references.forEach((r) => refs.add(r.replace(/\s/g, ""))); refs.add(e.source); refs.add(e.target); }
  const errs: string[] = [];
  const steps = [...(x.steps ?? []), ...(x.next_step ? [{ ...x.next_step, label: "next_step" }] : [])];
  steps.forEach((s, k) => {
    const lab = (s as { label?: string }).label ?? `step ${k}`;
    if (!s.edge_ids?.length) errs.push(`${lab}: no edge_ids`);
    for (const i of s.edge_ids ?? []) if (!allowed.has(i)) errs.push(`${lab}: unknown edge id ${i}`);
  });
  // a step asserting a variant effect must cite >= 1 claim whose span entails (entailment = yes) that effect class
  const { nodes: nd } = load();
  steps.forEach((s, k) => {
    const lab = (s as { label?: string }).label ?? `step ${k}`;
    const yes = (s.edge_ids ?? []).map((i) => edges.get(i)).filter((e): e is Edge => !!e && e.relation === "has_variant_effect" && e.entailment === "yes")
      .map((e) => String(nd.get(e.target)?.variant_effect));
    const a = effectAssertions(s.text);
    if (a.reduced && !yes.some((v) => ["loss_of_function", "dominant_negative", "mixed"].includes(v))) errs.push(`${lab}: asserts a reduced-function effect but cites no claim with entailment=yes for it`);
    if (a.increased && !yes.some((v) => ["gain_of_function", "mixed"].includes(v))) errs.push(`${lab}: asserts an increased-function effect but cites no claim with entailment=yes for it`);
  });
  for (const t of [x.summary_plain, ...(x.uncertainties ?? []), ...steps.map((s) => s.text)])
    for (const m of t.match(STYLE_RE) ?? []) errs.push(`style: do not write '${m}'; say 'research papers show' or 'we found'`);
  for (const t of [x.summary_plain, ...(x.uncertainties ?? []), ...steps.map((s) => s.text)])
    for (const m of t.match(ID_RE) ?? []) { const n = m.replace(/\s/g, "").replace(/^PMID:?/, "PMID:"); if (!refs.has(n)) errs.push(`identifier not in input: ${m}`); }
  if (!x.summary_plain) errs.push("missing summary_plain");
  if (!x.steps?.length) errs.push("no steps");
  if (!x.uncertainties?.length) errs.push("no uncertainties");
  return errs;
}

export function template(ids: string[]): Raw {
  const { nodes, edges } = load();
  return {
    summary_plain: "Recorded edges for the requested route. This is a list, not an interpretation.",
    steps: ids.slice(0, 6).map((i) => { const e = edges.get(i)!; return { text: `${nodes.get(e.source)?.name} — ${e.relation.replace(/_/g, " ")} — ${nodes.get(e.target)?.name} (${e.evidence_type}, ${e.status}, confidence ${e.confidence}).`, edge_ids: [i] }; }),
    uncertainties: ["Computed similarity is a hypothesis, not evidence of shared mechanism.", "Only the listed edges were considered; other evidence may exist."],
    next_step: { text: "Ask a domain expert to review the cited edges before acting.", edge_ids: ids.slice(0, 1) },
  };
}

export async function explain(ids: string[], title: string) {
  const key = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL;
  if (!key || !model) return null;
  const input = JSON.stringify(summarize(ids), null, 1);
  let errs: string[] = [];
  for (const attempt of [1, 2]) {
    const user = `Route: ${title}\nINPUT_EDGES:\n${input}` + (errs.length ? `\n\nYour previous answer was rejected for: ${errs.slice(0, 8).join("; ")}. Fix these problems.` : "");
    const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, response_format: { type: "json_schema", json_schema: SCHEMA }, messages: [{ role: "system", content: prompt.system }, { role: "user", content: user }] }) });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const x = JSON.parse((await r.json()).choices[0].message.content) as Raw;
    errs = validate(x, ids);
    if (!errs.length) return { ...x, source: "llm" as const, attempts: attempt, model, validation_errors: [] as string[] };
  }
  return { ...template(ids), source: "template" as const, attempts: 2, model: null, validation_errors: errs };
}
