import fs from "node:fs";
import path from "node:path";

export type Edge = {
  id: string; source: string; target: string; relation: string;
  evidence_type: "curated" | "computed" | "llm_extracted" | "manual";
  status: "supported" | "contradicted" | "hypothesis";
  source_db: string; references: string[]; retrieved_at: string; confidence: number;
  contradicts?: string[]; quoted_span?: string; population?: string; linked_phenotype_or_disease?: string;
  shared_phenotypes?: { id: string; name: string; ic: number }[]; method_note?: string; note?: string;
  frequency?: string; [k: string]: unknown;
};
export type Node = { id: string; type: string; name?: string; role?: string; mondo?: string | null; [k: string]: unknown };
export type Pair = { a: string; b: string; phenotype: number; mechanism: number | null; mechanism_available: boolean; combined: number;
  shared_phenotypes: { id: string; name: string; ic: number }[]; shared_mechanism_keys: string[] };
export type CounterPair = { counterexample: string; core: string; gene: string; status: string; evidence_note: string; same_cluster_freq: number;
  claims_benign: number; claims_severe: number; directional_benign: number; directional_severe: number };
export type Gap = { route_status: "supported" | "hypothesis" | "none";
  sources: { source: string; searched: boolean; count: number; unit: string; found?: number; found_unit?: string }[];
  routes: { to: string; combined_similarity: number; connection: string; connection_status: string; edge_ids: string[]; n_leads: number;
    leads: { trials: string[]; patient_groups: string[]; assets: string[] } }[];
  missing: string[]; suggested_question: string };
export type Graph = {
  meta: { built_at: string; sources: { name: string; retrieved_at: string }[]; trial_stats: unknown;
    mechanism_stats: { verified: number; extracted: number; span_drop_rate: number | null } | null;
    curated_counts: { patient_groups: number; assets: number };
    confidence_rule: string;
    review_precision_by_tier: Record<string, { sampled: number; reviewed: number; correct: number; partial: number; incorrect: number; precision: number | null }>;
    pairs: Pair[];
    contradiction_findings: { disease: string; kind: "mixed" | "contradicted"; reduced: string[]; increased: string[] }[];
    cluster_report: { counterexample_pairs: CounterPair[]; mean_stability: number; seeds: number; method: string; min_directional_claims: number };
    gaps: Record<string, Gap>;
  };
  nodes: Node[]; edges: Edge[];
  clusters: { cluster: number; members: { id: string; name: string; role: string; gene: string; stability: number; uncertain: boolean; uncertain_reason?: string; note?: string }[] }[];
};

let cache: { g: Graph; nodes: Map<string, Node>; edges: Map<string, Edge> } | null = null;
export function load() {
  if (!cache) {
    const g: Graph = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/graph.json"), "utf8"));
    cache = { g, nodes: new Map(g.nodes.map((n) => [n.id, n])), edges: new Map(g.edges.map((e) => [e.id, e])) };
  }
  return cache;
}

export const slugOf = (id: string) => id.replace(":", "_");
export const idOf = (slug: string) => slug.replace("_", ":");

export function diseases() {
  const { g, nodes } = load();
  const gene = new Map<string, string>();
  for (const e of g.edges) if (e.relation === "causes") gene.set(e.target, nodes.get(e.source)!.name!);
  return g.nodes.filter((n) => n.type === "disease").map((n) => ({ ...n, gene: gene.get(n.id) ?? "" }));
}

export function diseaseView(id: string) {
  const { g, nodes } = load();
  const d = diseases().find((x) => x.id === id);
  if (!d) return null;
  const geneId = `HGNC_SYMBOL:${d.gene}`;
  const cluster = g.clusters.find((c) => c.members.some((m) => m.id === id));
  const siblings = diseases().filter((x) => x.gene === d.gene);
  const sole = siblings.length === 1; // gene-level ("unspecified") claims can only be about this disease
  const related = g.meta.pairs.filter((p) => p.a === id || p.b === id).sort((x, y) => y.combined - x.combined)
    .map((p) => {
      const o = p.a === id ? p.b : p.a;
      const edges = g.edges.filter((e) => (e.relation === "phenotypically_similar_to" || e.relation === "shares_mechanism_with") &&
        ((e.source === id && e.target === o) || (e.source === o && e.target === id)));
      return { pair: p, other: nodes.get(o)!, edges };
    }).filter((r) => r.edges.length).slice(0, 5);
  const phenotypes = g.edges.filter((e) => e.source === id && e.relation === "has_phenotype")
    .map((e) => ({ edge: e, p: nodes.get(e.target)! }))
    .sort((a, b) => ((b.p.ic as number) ?? 0) - ((a.p.ic as number) ?? 0));
  const geneMech = g.edges.filter((e) => e.source === geneId && e.relation === "has_variant_effect")
    .map((e) => ({ edge: e, mech: nodes.get(e.target)!, pub: nodes.get(e.references[0]) }))
    .sort((a, b) => b.edge.confidence - a.edge.confidence);
  const mechanisms = geneMech.filter((m) => m.edge.disease_context === d.name || (sole && m.edge.disease_context === "unspecified"));
  const geneLevel = geneMech.filter((m) => !mechanisms.includes(m) && m.edge.disease_context === "unspecified");
  const mechOtherCount = geneMech.length - mechanisms.length - geneLevel.length;
  const effectCounts: Record<string, number> = {};
  for (const m of mechanisms) { const k = String(m.mech.variant_effect); effectCounts[k] = (effectCounts[k] ?? 0) + 1; }
  const trials = g.edges.filter((e) => e.target === id && e.relation === "studied_in")
    .map((e) => ({ edge: e, study: nodes.get(e.source)! }))
    .sort((a, b) => Number(b.study.status === "RECRUITING") - Number(a.study.status === "RECRUITING"));
  const orgs = g.edges.filter((e) => e.target === id && e.relation === "serves").map((e) => ({ edge: e, org: nodes.get(e.source)! }));
  const assets = g.edges.filter((e) => e.source === geneId && e.relation === "has_asset").map((e) => ({ edge: e, asset: nodes.get(e.target)! }));
  const causes = g.edges.find((e) => e.relation === "causes" && e.target === id)!;
  const pairInfo = g.meta.cluster_report.counterexample_pairs.filter((p) => p.counterexample === id || p.core === id);
  const findings = g.meta.contradiction_findings.filter((f) => f.disease === id);
  return { d, cluster, related, phenotypes, mechanisms, geneLevel, mechOtherCount, effectCounts, sole, trials, orgs, assets, causes,
    pairInfo, findings, gap: g.meta.gaps[id] };
}
