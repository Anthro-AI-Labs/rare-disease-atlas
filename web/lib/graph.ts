import fs from "node:fs";
import path from "node:path";

export type Edge = {
  id: string; source: string; target: string; relation: string;
  evidence_type: "curated" | "computed" | "llm_extracted" | "manual";
  status: "supported" | "contradicted" | "hypothesis";
  source_db: string; references: string[]; retrieved_at: string; confidence: number;
  contradicts?: string[]; quoted_span?: string; population?: string; linked_phenotype_or_disease?: string;
  shared_phenotypes?: { id: string; name: string; ic: number }[]; method_note?: string; note?: string;
  frequency?: string; entailment?: string | null; entailment_rationale?: string; extracted_variant_effect?: string; extracted_population?: string; review_verdict?: string; [k: string]: unknown;
};
export type Node = { id: string; type: string; name?: string; role?: string; mondo?: string | null; definition?: string; definition_url?: string | null; [k: string]: unknown };
export type Pair = { a: string; b: string; phenotype: number; mechanism: number | null; mechanism_available: boolean; combined: number;
  shared_phenotypes: { id: string; name: string; ic: number }[]; shared_mechanism_keys: string[] };
export type CounterPair = { counterexample: string; core: string; gene: string; status: string; evidence_note: string; same_cluster_freq: number;
  claims_benign: number; claims_severe: number; directional_benign: number; directional_severe: number };
export type Gap = { route_status: "supported" | "hypothesis" | "none";
  sources: { source: string; searched: boolean; count: number; unit: string; found?: number; found_unit?: string }[];
  routes: { to: string; combined_similarity: number; connection: string; connection_status: string; edge_ids: string[]; n_leads: number;
    leads: { trials: string[]; patient_groups: string[]; assets: string[] } }[];
  missing: string[]; suggested_question: string };
export type Step = { text: string; edge_ids: string[] };
export type Explanation = { summary_plain: string; steps: Step[]; uncertainties: string[]; next_step: Step; source: "llm" | "template";
  attempts: number; first_try_pass: boolean; model: string | null; input_edge_ids: string[]; generated_at: string };
export type Graph = {
  meta: { built_at: string; sources: { name: string; retrieved_at: string }[]; trial_stats: unknown;
    curated_counts: { patient_groups: number; assets: number };
    confidence_rule: string;
    entailment_stats?: { checked: number; skipped_unclear: number; by_verdict: Record<string, number>; by_gene: Record<string, Record<string, number>>; population_checked: Record<string, number>; population_changed: number } | null;
    review_agreement?: { n_double_reviewed: number; agree: number; percent_agreement: number | null; cohens_kappa: number | null };
    review_overall?: { sampled: number; reviewed: number; correct: number; partial: number; incorrect: number; share_reviewed: number | null };
    mechanism_stats: { verified: number; extracted: number; dropped_span: number; span_drop_rate: number | null; abstracts: number } | null;
    review_precision_by_tier: Record<string, { sampled: number; reviewed: number; correct: number; partial: number; incorrect: number; precision: number | null }>;
    pairs: Pair[];
    contradiction_findings: { disease: string; kind: "mixed" | "contradicted"; reduced: string[]; increased: string[] }[];
    cluster_report: { counterexample_pairs: CounterPair[]; mean_stability: number; seeds: number; method: string; min_directional_claims: number };
    gaps: Record<string, Gap>;
    explanation_stats?: { diseases?: number; llm?: number; first_try_pass?: number; template_fallback?: number };
    network_stats?: { kept: number; by_level: Record<string, number> } | null;
    curated_skipped?: string[];
    share_mechanism_min_ui: number;
  };
  explanations: Record<string, Explanation>;
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
  const invs = investigatorsForPmids(geneMech.map((m) => m.edge.references[0]), 6);
  return { invs, d, cluster, related, phenotypes, mechanisms, geneLevel, mechOtherCount, effectCounts, sole, trials, orgs, assets, causes,
    pairInfo, findings, gap: g.meta.gaps[id] };
}

export const PHENO_SLUG = (hp: string) => hp.replace(":", "_");

export function investigatorsForPmids(pmids: string[], limit = 6) {
  const { g, nodes } = load();
  const set = new Set(pmids);
  const by = new Map<string, number>();
  for (const e of g.edges) if (e.relation === "authored" && set.has(e.target)) by.set(e.source, (by.get(e.source) ?? 0) + 1);
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, n]) => ({ inv: nodes.get(id)!, papers: n }));
}

export function geneClaims(geneId: string) {
  const { g, nodes } = load();
  return g.edges.filter((e) => e.source === geneId && e.relation === "has_variant_effect")
    .map((e) => ({ edge: e, mech: nodes.get(e.target)!, pub: nodes.get(e.references[0]) })).sort((a, b) => b.edge.confidence - a.edge.confidence);
}

export function mechanismView(key: string) {
  const { g, nodes } = load();
  const mech = nodes.get(`MECH:${key.replace("--", "|")}`);
  if (!mech) return null;
  const edges = g.edges.filter((e) => e.target === mech.id && e.relation === "has_variant_effect");
  const byGene = new Map<string, typeof edges>();
  for (const e of edges) byGene.set(e.source, [...(byGene.get(e.source) ?? []), e]);
  const dis = diseases();
  const genes = [...byGene.entries()].map(([gid, es]) => {
    const sym = nodes.get(gid)!.name!;
    return { gid, sym, edges: es.sort((a, b) => b.confidence - a.confidence), diseases: dis.filter((d) => d.gene === sym),
      directPmids: es.map((e) => e.references[0]) };
  }).sort((a, b) => b.edges.length - a.edges.length);
  const invs = investigatorsForPmids(edges.map((e) => e.references[0]), 12);
  return { mech, genes, n: edges.length, invs };
}

export function phenotypeView(hp: string) {
  const { nodes } = load();
  const fs_ = fs.readFileSync(path.join(process.cwd(), "public/data/search.json"), "utf8");
  const it = (JSON.parse(fs_) as { type: string; id: string; label: string; aliases: string[]; diseases?: string[] }[]).find((i) => i.type === "symptom" && i.id === hp);
  if (!it) return null;
  const { g } = load();
  const direct = new Map<string, { frequency?: string }>();
  for (const e of g.edges) if (e.relation === "has_phenotype" && e.target === hp) direct.set(e.source, { frequency: e.frequency });
  return { term: it, diseases: (it.diseases ?? []).map((id) => ({ d: diseases().find((x) => x.id === id)!, direct: direct.get(id) })).filter((x) => x.d && nodes.has(x.d.id)) };
}

export function orgView(slug: string) {
  const { g, nodes } = load();
  const org = nodes.get(`ORG:${slug}`);
  if (!org) return null;
  return { org, serves: g.edges.filter((e) => e.source === org.id && e.relation === "serves").map((e) => ({ edge: e, d: diseases().find((x) => x.id === e.target)! })) };
}

export function orgSlugs() { return load().g.nodes.filter((n) => n.type === "patient_org").map((n) => n.id.slice(4)); }
export function mechanismKeys() { return load().g.nodes.filter((n) => n.type === "mechanism").map((n) => n.id.slice(5).replace("|", "--")); }
export function phenotypeIds() {
  const s = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/data/search.json"), "utf8")) as { type: string; id: string }[];
  return s.filter((i) => i.type === "symptom").map((i) => i.id);
}

/** Maria's action view: everything is derived from graph.json, so curated CSV rows appear automatically after `make graph`. */
export function actionView(id: string) {
  const { g, nodes } = load();
  const v = diseaseView(id)!;
  const gap = g.meta.gaps[id];
  const direct = (did: string) => new Map(g.edges.filter((e) => e.source === did && e.relation === "has_phenotype").map((e) => [e.target, nodes.get(e.target)!]));
  const mine = direct(id);
  const effectOf = (did: string) => {
    const dv = diseaseView(did)!;
    const w: Record<string, number> = {};
    for (const m of dv.mechanisms) if (m.mech.variant_effect !== "unclear") w[String(m.mech.variant_effect)] = (w[String(m.mech.variant_effect)] ?? 0) + m.edge.confidence;
    const n = dv.mechanisms.filter((m) => m.mech.variant_effect !== "unclear").length;
    const top = Object.entries(w).sort((a, b) => b[1] - a[1])[0];
    return { n, dominant: n >= g.meta.cluster_report.min_directional_claims && top ? top[0] : null };
  };
  const mineEffect = effectOf(id);
  const rel = gap.routes.map((r) => {
    const other = direct(r.to);
    const ic = (n: Node) => (n.ic as number) ?? 0;
    const only = (a: Map<string, Node>, b: Map<string, Node>) => [...a.values()].filter((n) => !b.has(n.id)).sort((x, y) => ic(y) - ic(x)).slice(0, 4);
    const pair = g.meta.pairs.find((p) => (p.a === id && p.b === r.to) || (p.a === r.to && p.b === id));
    return { route: r, to: nodes.get(r.to)!, shared: pair?.shared_phenotypes.slice(0, 4) ?? [], onlyHere: only(mine, other), onlyThere: only(other, mine),
      effects: { here: mineEffect, there: effectOf(r.to) },
      edges: r.edge_ids.map((i) => g.edges.find((e) => e.id === i)).filter(Boolean) as Edge[] };
  });
  const orgIds = new Set<string>(); const communities: { org: Node; via: string; edge: Edge }[] = [];
  for (const o of v.orgs) { orgIds.add(o.org.id); communities.push({ org: o.org, via: "this disease", edge: o.edge }); }
  for (const r of rel) for (const eid of r.route.leads.patient_groups) {
    const e = g.edges.find((x) => x.id === eid)!;
    if (!orgIds.has(e.source)) { orgIds.add(e.source); communities.push({ org: nodes.get(e.source)!, via: String(r.to.name), edge: e }); }
  }
  const assetIds = new Set<string>(); const assets: { asset: Node; via: string; edge: Edge }[] = [];
  for (const a of v.assets) { assetIds.add(a.asset.id); assets.push({ asset: a.asset, via: `${v.d.gene} (this disease)`, edge: a.edge }); }
  for (const r of rel) for (const eid of r.route.leads.assets) {
    const e = g.edges.find((x) => x.id === eid)!;
    if (!assetIds.has(e.target)) { assetIds.add(e.target); assets.push({ asset: nodes.get(e.target)!, via: `${nodes.get(e.source)!.name} (${r.to.name})`, edge: e }); }
  }
  const review: string[] = [];
  for (const f of v.findings) review.push(f.kind === "contradicted" ? "Conflicting evidence on the variant effect for this disease (see both sides below): expert review needed." : "Mixed variant effects tied to different phenotypes: a finding to confirm with an expert.");
  for (const p of v.pairInfo) if (p.status === "uncertain membership") review.push(`Same-gene benign/severe pair (${p.gene}): ${p.directional_benign < 3 || p.directional_severe < 3 ? "insufficient disease-level evidence" : "effects differ"}; grouping is uncertain.`);
  if (mineEffect.dominant === null) review.push(`Insufficient disease-level mechanism evidence (${mineEffect.n} directional claims; ${g.meta.cluster_report.min_directional_claims} needed).`);
  if (rel.some((r) => r.route.connection_status === "hypothesis")) review.push("Links to other diseases are computed similarity or same-gene only (hypotheses); an expert should confirm before outreach is framed around a shared mechanism.");
  const lowConf = v.mechanisms.filter((m) => m.edge.confidence <= 0.5).length;
  if (lowConf) review.push(`${lowConf} of ${v.mechanisms.length} mechanism claims for this disease have confidence ≤ 0.5 (span does not name the gene, or direction unclear).`);
  const ex = g.explanations[id];
  return { v, gap, rel, communities, assets, review, explanation: ex };
}

export type GNode = { id: string; gene: string; name: string; cluster: number; role: string; route: "supported" | "hypothesis" | "none"; uncertain: boolean; conflict: boolean; href: string };
export type GLink = { a: string; b: string; kind: "hyp" | "gene" | "sup" | "review"; w: number; mech: boolean };

/** Disease graph: nodes coloured by route status; dashed amber = computed hypothesis link; solid grey = same gene; solid green = curated shared route;
 *  pink dotted = same-gene mild/severe pair whose grouping is uncertain (expert review). */
export function graphData() {
  const { g } = load();
  const ds = diseases();
  const cl = new Map<string, { c: number; unc: boolean }>();
  for (const c of g.clusters) for (const m of c.members) cl.set(m.id, { c: c.cluster, unc: m.uncertain });
  const conflict = new Set(g.meta.contradiction_findings.filter((f) => f.kind === "contradicted").map((f) => f.disease));
  const nodes: GNode[] = ds.map((d) => ({ id: d.id, gene: d.gene, name: d.name!, cluster: cl.get(d.id)?.c ?? 0, role: String(d.role), route: g.meta.gaps[d.id].route_status,
    uncertain: !!cl.get(d.id)?.unc, conflict: conflict.has(d.id), href: `/disease/${slugOf(d.id)}` }));
  const links = new Map<string, GLink>();
  const key = (a: string, b: string) => [a, b].sort().join("|");
  for (const p of g.meta.pairs) {
    const hasEdge = g.edges.some((e) => (e.relation === "phenotypically_similar_to" || e.relation === "shares_mechanism_with") && ((e.source === p.a && e.target === p.b) || (e.source === p.b && e.target === p.a)));
    const sameGene = ds.find((d) => d.id === p.a)!.gene === ds.find((d) => d.id === p.b)!.gene;
    if (hasEdge) links.set(key(p.a, p.b), { a: p.a, b: p.b, kind: "hyp", w: p.combined, mech: p.mechanism_available && (p.mechanism ?? 0) >= g.meta.share_mechanism_min_ui });
    else if (sameGene) links.set(key(p.a, p.b), { a: p.a, b: p.b, kind: "gene", w: p.combined, mech: false });
    if (hasEdge && sameGene) links.get(key(p.a, p.b))!.kind = "hyp";
  }
  for (const p of g.meta.cluster_report.counterexample_pairs) if (p.status === "uncertain membership") {
    const l = links.get(key(p.counterexample, p.core));
    links.set(key(p.counterexample, p.core), { a: p.counterexample, b: p.core, kind: "review", w: l?.w ?? 0, mech: false });
  }
  for (const gp of Object.values(g.meta.gaps)) for (const r of gp.routes) if (r.connection_status === "supported") {
    const a = Object.entries(g.meta.gaps).find(([, v]) => v === gp)![0];
    links.set(key(a, r.to), { a, b: r.to, kind: "sup", w: r.combined_similarity, mech: false });
  }
  return { nodes, links: [...links.values()] };
}
