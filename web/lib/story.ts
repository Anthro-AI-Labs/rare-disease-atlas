import fs from "node:fs";
import path from "node:path";
import { actionView, diseases, graphData, load, slugOf, type Edge, type SegStatus, type Segments } from "@/lib/graph";
import { FUNC, whyLine } from "@/lib/plain";
import type { Kind } from "@/lib/status";

/** Everything on the story layer is built DETERMINISTICALLY from graph.json counts and the controlled vocabulary (no LLM). */

export type Seg = string | { t: string; k: Kind };
export type SatStatus = "supported" | "pending" | "hypothesis" | "review";
export type Sat = { id: string; gene: string; common: string; name: string; status: SatStatus; why: string; edgeIds: string[]; href: string; func: string; groups: string[];
  kind: string; studies: { id: string; name: string; status: "supported" | "pending"; edge_id: string }[]; segments: Segments; overall: SegStatus; opposite: boolean };
export type Effect = "loss_of_function" | "gain_of_function" | "mixed" | "neutral";

let aliasCache: Map<string, string[]> | null = null;
function aliases(id: string) {
  aliasCache ??= new Map((JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/search.json"), "utf8")) as { type: string; id: string; aliases: string[] }[])
    .filter((i) => i.type === "disease").map((i) => [i.id, i.aliases]));
  return aliasCache.get(id) ?? [];
}

/** Everyday name first (a MONDO synonym when one fits, else "<GENE>-related encephalopathy"); the OMIM name stays second. */
export function commonName(id: string) {
  const d = diseases().find((x) => x.id === id)!;
  const g = d.gene, al = aliases(id).filter((a) => !/^(MONDO|OMIM):/.test(a));
  const dravet = d.name!.match(/\((Dravet syndrome)\)/i);
  if (dravet) return `${g} Dravet syndrome`;
  const pick = (rx: RegExp) => al.filter((a) => rx.test(a)).sort((a, b) => a.length - b.length)[0];
  return pick(new RegExp(`^${g}[- ]related (encephalopathy|epilepsy)$`, "i")) ?? pick(new RegExp(`^${g} (encephalopathy|syndrome)$`, "i"))
    ?? pick(new RegExp(`^${g} benign`, "i")) ?? `${g}-related ${d.role === "counterexample" ? "seizures" : "encephalopathy"}`;
}

/** A gene's function category = the most frequent molecular_function among its claims whose quote states the effect (entailment yes). */
export function geneFunction(sym: string) {
  const { g, nodes } = load();
  const c: Record<string, number> = {};
  for (const e of g.edges) if (e.source === `HGNC_SYMBOL:${sym}` && e.relation === "has_variant_effect" && e.entailment === "yes") {
    const f = String(nodes.get(e.target)!.molecular_function); c[f] = (c[f] ?? 0) + 1;
  }
  const top = Object.entries(c).filter(([f]) => f !== "other").sort((a, b) => b[1] - a[1])[0]?.[0] ?? "other";
  return top;
}
export const geneTip = (sym: string) => { const f = geneFunction(sym); return { sym, func: f, text: `${sym} ${FUNC[f].desc}.` }; };

export function diseaseTip(id: string) {
  const d = diseases().find((x) => x.id === id)!;
  const def = String(d.definition ?? "");
  const first = def.split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/)[0] ?? "";
  const short = first.length > 200 ? `${first.slice(0, first.lastIndexOf(" ", 190))}…` : first;
  return { id, common: commonName(id), name: d.name!, gene: d.gene, def: short || null,
    url: (d.definition_url as string | null) ?? (d.mondo ? `https://monarchinitiative.org/${d.mondo}` : null), mondo: (d.mondo as string | null) ?? null };
}

const ACTIVE = new Set(["RECRUITING", "NOT_YET_RECRUITING", "ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION"]);
const n = (k: number, one: string, many: string) => `${k === 0 ? "no" : k} ${k === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function story(id: string) {
  const a = actionView(id);
  const { g, nodes } = load();
  const { v, rel, communities, relatedCommunities, assets } = a;
  const d = v.d;
  const common = commonName(id);
  const contradicted = new Set(g.meta.contradiction_findings.filter((f) => f.kind === "contradicted").map((f) => f.disease));
  const groupsFor = (did: string) => g.edges.filter((e) => e.relation === "serves" && e.target === did).map((e) => nodes.get(e.source)!.name!);

  // --- Scene B: who shares your biology ---
  const sats: Sat[] = rel.map((r) => {
    const other = diseases().find((x) => x.id === r.to.id)!;
    const status: SatStatus = r.route.connection_status === "supported" ? "supported" : r.route.connection_pending ? "pending" : contradicted.has(r.to.id) ? "review" : "hypothesis";
    const study = r.route.studies[0];
    return { id: other.id, gene: other.gene, common: commonName(other.id), name: other.name!, status,
      why: study ? `Both are included in the same study: ${study.name}.` : whyLine(r.shared), edgeIds: r.route.edge_ids,
      href: `/disease/${slugOf(other.id)}`, func: geneFunction(other.gene), groups: r.route.opposite_mechanisms || other.gene === d.gene ? [] : groupsFor(other.id),
      kind: r.route.connection, studies: r.route.studies, segments: r.route.segments, overall: r.route.overall, opposite: !!r.route.opposite_mechanisms };
  });
  for (const p of v.pairInfo) {
    const oid = p.counterexample === id ? p.core : p.counterexample;
    if (sats.some((s) => s.id === oid)) continue;
    const other = diseases().find((x) => x.id === oid)!;
    const causes = g.edges.filter((e) => e.relation === "causes" && (e.target === id || e.target === oid)).map((e) => e.id);
    sats.push({ id: oid, gene: other.gene, common: commonName(oid), name: other.name!, status: p.status === "uncertain membership" ? "review" : "hypothesis",
      why: `Same gene (${p.gene}), but one form is mild and the other severe. An expert should check how they relate.`, edgeIds: causes,
      href: `/disease/${slugOf(oid)}`, func: geneFunction(other.gene), groups: [], kind: "same_gene", studies: [], segments: a.gap.route_segments, overall: a.gap.route_overall, opposite: false });
  }
  const linked = sats.filter((s) => rel.some((r) => r.to.id === s.id)); // computed neighbours only; same-gene mild/severe partners are shown but not counted

  // --- Scene C: what already exists ---
  const studies = v.trials.map((t) => ({ id: t.study.id, name: String(t.study.name), status: String(t.study.status), url: String(t.study.url), edge: t.edge.id }));
  const active = studies.filter((s) => ACTIVE.has(s.status));
  // groups = patient groups of THIS gene only; groups of other genes are "related communities" (never across opposite mechanisms) and never a recommendation
  const groups = communities.map((c) => ({ name: c.org.name!, via: c.via, edge: c.edge.id, url: (c.org.url as string) || null }));
  const relatedGroups = relatedCommunities.map((c) => ({ name: c.org.name!, via: c.via, gene: c.gene, edge: c.edge.id, url: (c.org.url as string) || null }));
  const registries = assets.map((x) => ({ name: x.asset.name!, via: x.via, edge: x.edge.id }));

  // --- Scene A: mechanism picture, only from claims whose quote states the effect ---
  const yes = v.mechanisms.filter((m) => m.edge.entailment === "yes" && m.mech.variant_effect !== "unclear");
  const fc: Record<string, number> = {};
  for (const m of v.mechanisms) { const f = String(m.mech.molecular_function); if (f !== "other") fc[f] = (fc[f] ?? 0) + 1; }
  const func = Object.entries(fc).sort((x, y) => y[1] - x[1])[0]?.[0] ?? geneFunction(d.gene);
  const reduced = yes.filter((m) => ["loss_of_function", "dominant_negative"].includes(String(m.mech.variant_effect)));
  const increased = yes.filter((m) => m.mech.variant_effect === "gain_of_function");
  let effect: Effect = "neutral";
  if (Math.max(reduced.length, increased.length) < 2) effect = "neutral"; // one quote is too thin to animate as a direction
  else if (v.findings.length || (reduced.length && increased.length && Math.min(reduced.length, increased.length) / Math.max(reduced.length, increased.length) > 0.5)) effect = "mixed";
  else if (reduced.length > increased.length) effect = "loss_of_function";
  else if (increased.length > reduced.length) effect = "gain_of_function";
  const effectEdges = (effect === "loss_of_function" ? reduced : effect === "gain_of_function" ? increased : effect === "mixed" ? [...reduced.slice(0, 3), ...increased.slice(0, 3)] : [])
    .sort((x, y) => y.edge.confidence - x.edge.confidence).slice(0, 6).map((m) => m.edge.id);

  // --- Next step (deterministic priority list) ---
  const top = linked[0];
  let next: { text: string; kind: Kind; short: string };
  if (groups.length) { const o = groups[0]; next = { kind: "accent", short: `contact ${o.name}`, text: `Contact ${o.name} and share what this page shows.` }; }
  else if (active.length) next = { kind: "accent", short: `ask a study team whether ${d.gene} families are in scope`, text: `Ask the team behind one of the ${active.length} active studies that name ${d.gene} whether families like yours can take part.` };
  else if (top) next = { kind: "accent", short: `ask a genetics expert whether the link to ${top.common} is real`, text: `Ask a genetics expert whether the possible link to ${top.common} is real, using the sources on this page.` };
  else next = { kind: "accent", short: "ask a genetics expert which evidence is missing", text: "Ask a genetics expert which evidence is missing, using the gaps listed on this page." };

  // --- Answer sentence ---
  const relKind: Kind = linked.some((s) => s.status === "supported") ? "ok" : linked.length ? "hyp" : "ctx";
  const answer: Seg[] = [];
  if (linked.length) answer.push(`${common} `, linked.some((s) => s.status === "supported") ? "shares" : "may share", " key features with ", { t: `${n(linked.length, "other rare condition", "other rare conditions")}`, k: relKind }, ". ");
  else answer.push(`We found `, { t: "no other rare condition", k: "ctx" }, ` close enough to ${common} to compare yet. `);
  if (groups.length) answer.push({ t: n(groups.length, "patient group", "patient groups"), k: "ok" }, " and ", { t: n(active.length, "active study", "active studies"), k: active.length ? "ok" : "ctx" }, " may be relevant. ");
  else if (active.length) answer.push({ t: `No patient group for ${d.gene}`, k: "ctx" }, " is on file yet, but ", { t: n(active.length, "active study", "active studies"), k: "ok" }, ` ${active.length === 1 ? "names" : "name"} ${d.gene}. `);
  else answer.push({ t: `No patient group for ${d.gene}`, k: "ctx" }, " or ", { t: "active study", k: "ctx" }, " is on file yet. ");
  answer.push("Your next step: ", { t: next.short, k: "accent" }, ".");

  return { a, d, common, func, effect, effectEdges, sats, linked, studies, active, groups, relatedGroups, registries, next, answer, relKind,
    routeStatus: a.gap.route_status, tip: diseaseTip(id), gene: geneTip(d.gene) };
}
export type Story = ReturnType<typeof story>;

/** Plain-text answer for places without highlights (map side card, print). */
export const answerText = (s: Seg[]) => s.map((x) => (typeof x === "string" ? x : x.t)).join("").replace(/^./, (c) => cap(c));

/** Copyable message about one link. Only facts from graph.json; recipient left for the user when no group is on file. */
export function messageFor(s: Story, sat: Sat, origin = "{ATLAS_URL}") {
  const { g } = load();
  const edges = sat.edgeIds.map((i) => g.edges.find((e) => e.id === i)).filter(Boolean) as Edge[];
  const pair = g.meta.pairs.find((p) => (p.a === s.d.id && p.b === sat.id) || (p.b === s.d.id && p.a === sat.id));
  const status = sat.status === "supported" ? "This link is supported by a curated shared patient group or asset."
    : sat.status === "review" ? "This link needs expert review: sources disagree or the grouping is uncertain."
      : "This is a computed hypothesis from shared symptoms, not a confirmed shared mechanism.";
  const studies = s.active.slice(0, 3).map((t) => `- ${t.id}: ${t.name.slice(0, 90)}${t.name.length > 90 ? "…" : ""} (https://clinicaltrials.gov/study/${t.id})`);
  // The To: line is never pre-filled with a group of another gene (a recipient across genes or mechanisms must be chosen by the sender).
  return [
    `To: a ${sat.gene} patient community (the Atlas does not fill in recipients from another gene: please add the name yourself)`,
    `Subject: Possible shared ground between ${s.common} and ${sat.common}`,
    "",
    "Hello,",
    "",
    `I am part of the community around ${s.common} (${s.d.name}, gene ${s.d.gene}). The Rare Disease Atlas, a research prototype, lists ${sat.common} (${sat.name}, gene ${sat.gene}) as a related condition. ${sat.why}`,
    "",
    status,
    "",
    "Would you be open to a short call to compare what our communities already have, such as registries, natural history data or studies?",
    "",
    "Sources:",
    `- Symptom annotations: Human Phenotype Ontology, ${s.d.id} and ${sat.id}${pair ? ` (${pair.shared_phenotypes.length} shared symptoms)` : ""}`,
    ...edges.flatMap((e) => e.references).filter((r) => /^(PMID|NCT)/.test(r)).slice(0, 4).map((r) => `- ${r}`),
    ...(studies.length ? [`- Active studies naming ${s.d.gene}:`, ...studies.map((x) => `  ${x}`)] : []),
    `- Atlas page: ${origin}/disease/${slugOf(s.d.id)}`,
    "",
    "Not medical advice.",
  ].join("\n");
}

/** Map nodes with what the side card needs: everyday name, plain one-sentence summary (the same template as the answer), gene role. */
export function mapData() {
  const { nodes, links } = graphData();
  return { links, nodes: nodes.map((n) => { const s = story(n.id); return { ...n, common: s.common, summary: answerText(s.answer), func: s.gene.func }; }) };
}
export type MapNode = ReturnType<typeof mapData>["nodes"][number];
