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
export type Graph = {
  meta: { built_at: string; sources: { name: string; retrieved_at: string }[]; trial_stats: unknown;
    mechanism_stats: { verified: number; extracted: number; span_drop_rate: number | null } | null;
    curated_counts: { patient_groups: number; assets: number } };
  nodes: Node[]; edges: Edge[];
  clusters: { cluster: number; members: { id: string; name: string; role: string; gene: string; stability: number; uncertain: boolean; uncertain_reason?: string }[] }[];
};

let cache: { g: Graph; nodes: Map<string, Node> } | null = null;
export function load() {
  if (!cache) {
    const g: Graph = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/graph.json"), "utf8"));
    cache = { g, nodes: new Map(g.nodes.map((n) => [n.id, n])) };
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
  const similar = g.edges
    .filter((e) => e.relation === "phenotypically_similar_to" && (e.source === id || e.target === id))
    .sort((a, b) => b.confidence - a.confidence)
    .map((e) => ({ edge: e, other: nodes.get(e.source === id ? e.target : e.source)! }));
  const phenotypes = g.edges.filter((e) => e.source === id && e.relation === "has_phenotype")
    .map((e) => ({ edge: e, p: nodes.get(e.target)! }))
    .sort((a, b) => ((b.p.ic as number) ?? 0) - ((a.p.ic as number) ?? 0));
  const geneMech = g.edges.filter((e) => e.source === geneId && e.relation === "has_variant_effect")
    .map((e) => ({ edge: e, mech: nodes.get(e.target)!, pub: nodes.get(e.references[0]) }));
  // claims about this disease, or gene-level ("unspecified"); claims about this gene's other diseases are counted, not shown
  const mechanisms = geneMech.filter((m) => m.edge.disease_context === d.name || m.edge.disease_context === "unspecified");
  const mechOtherCount = geneMech.length - mechanisms.length;
  const trials = g.edges.filter((e) => e.target === id && e.relation === "studied_in")
    .map((e) => ({ edge: e, study: nodes.get(e.source)! }));
  const orgs = g.edges.filter((e) => e.target === id && e.relation === "serves")
    .map((e) => ({ edge: e, org: nodes.get(e.source)! }));
  const assets = g.edges.filter((e) => e.source === geneId && e.relation === "has_asset")
    .map((e) => ({ edge: e, asset: nodes.get(e.target)! }));
  const causes = g.edges.find((e) => e.relation === "causes" && e.target === id)!;
  return { d, cluster, mechOtherCount, similar, phenotypes, mechanisms, trials, orgs, assets, causes };
}
