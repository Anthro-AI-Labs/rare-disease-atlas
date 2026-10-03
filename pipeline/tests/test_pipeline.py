import pytest
from pydantic import ValidationError
from spans import verify_span, validate_explanation
from models import Edge

ABS = "STXBP1 variants cause  haploinsufficiency\nand reduced synaptic   vesicle release in patients."


def test_span_exact_whitespace_normalized():
    assert verify_span("haploinsufficiency and reduced synaptic vesicle release", ABS)


def test_span_rejects_paraphrase_and_short():
    assert not verify_span("STXBP1 causes loss of function in neurons", ABS)
    assert not verify_span("STXBP1", ABS)
    assert not verify_span("", ABS)


GOOD = dict(id="E1", source="a", target="b", relation="r", evidence_type="curated", source_db="x",
            references=["PMID:1"], retrieved_at="2026-01-01", confidence=0.5, status="supported")


def test_edge_schema_ok_and_extras_kept():
    assert Edge(**GOOD, quoted_span="x").quoted_span == "x"


@pytest.mark.parametrize("bad", [{"evidence_type": "guess"}, {"status": "proven"}, {"confidence": 1.5}])
def test_edge_schema_rejects(bad):
    with pytest.raises(ValidationError):
        Edge(**{**GOOD, **bad})


def test_edge_requires_all_fields():
    with pytest.raises(ValidationError):
        Edge(**{k: v for k, v in GOOD.items() if k != "references"})


def test_explanation_validator():
    ok, _ = validate_explanation({"steps": [{"text": "t", "edge_ids": ["E1"]}]}, ["E1", "E2"])
    assert ok
    ok, errs = validate_explanation({"steps": [{"text": "t", "edge_ids": ["E9"]}, {"text": "u", "edge_ids": []}]}, ["E1"])
    assert not ok and len(errs) == 2


def test_exported_graph_valid_if_present():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    for e in g["edges"]:
        Edge(**e)
        if e["evidence_type"] == "computed":
            assert e["status"] == "hypothesis"
        if e["evidence_type"] == "llm_extracted":
            assert e["quoted_span"]


def _cluster_report():
    import json, common
    p = common.GRAPH / "cluster_report.json"
    if not p.exists():
        pytest.skip("graph not built")
    return json.loads(p.read_text()), json.loads((common.GRAPH / "clusters.json").read_text())


def test_counterexample_pairs_follow_disease_level_evidence():
    """Co-clustering of a benign form with its gene's DEE is acceptable only as 'same mechanism, different severity', which needs the
    SAME dominant variant effect from disease-level evidence (>= MIN_DIRECTIONAL claims each side). Otherwise both are 'uncertain'."""
    import mech
    rep, clusters = _cluster_report()
    members = {m["id"]: m for c in clusters for m in c["members"]}
    cl = {m["id"]: c["cluster"] for c in clusters for m in c["members"]}
    assert len(rep["counterexample_pairs"]) == 3
    for p in rep["counterexample_pairs"]:
        a, b = p["counterexample"], p["core"]
        if cl[a] != cl[b]:
            assert p["status"] == "separated"
        elif p["status"] == "same mechanism, different severity":
            assert p["dominant_benign"] and p["dominant_benign"] == p["dominant_severe"]
            assert min(p["directional_benign"], p["directional_severe"]) >= mech.MIN_DIRECTIONAL
        else:
            assert p["status"] == "uncertain membership"
            assert members[a]["uncertain"] and members[b]["uncertain"]


def _claim(pmid, effect, pheno="seizures", span="x" * 20, fn="sodium_channel", conf=0.8):
    return {"gene": "G", "pmid": pmid, "variant_effect": effect, "molecular_function": fn, "linked_phenotype_or_disease": pheno,
            "quoted_span": span + pmid, "disease_context": "D1", "confidence": conf}


def test_contradiction_vs_mixed_and_unclear_excluded():
    import mech
    idx = {("G", "D1"): "OMIM:1"}
    same = [_claim("1", "loss_of_function"), _claim("2", "loss_of_function"), _claim("3", "gain_of_function"), _claim("4", "gain_of_function")]
    assert mech.contradictions(same, idx)[0]["kind"] == "contradicted"
    mixed = [_claim("1", "loss_of_function", "autism"), _claim("2", "loss_of_function", "autism"),
             _claim("3", "gain_of_function", "infantile spasms"), _claim("4", "gain_of_function", "infantile spasms")]
    assert mech.contradictions(mixed, idx)[0]["kind"] == "mixed"
    one_each = [_claim("1", "loss_of_function"), _claim("3", "gain_of_function")]
    assert mech.contradictions(one_each, idx) == []          # a single PMID per side is not enough
    unclear = same[:2] + [_claim("5", "unclear"), _claim("6", "unclear")]
    assert mech.contradictions(unclear, idx) == [] and mech.profile(unclear[2:]) is None


def test_gene_level_attribution_only_for_single_disease_genes():
    import mech
    c = {**_claim("1", "loss_of_function"), "disease_context": "unspecified"}
    one = {("G", "D1"): "OMIM:1"}
    two = {("G", "D1"): "OMIM:1", ("G", "D2"): "OMIM:2"}
    assert mech.specific_claims([c], one, gene_level=True) == {"OMIM:1": [c]}
    assert mech.specific_claims([c], two, gene_level=True) == {}
    assert mech.specific_claims([c], one) == {}


def test_unclear_claims_capped_and_not_in_similarity():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    mech_node = {n["id"]: n for n in g["nodes"]}
    for e in g["edges"]:
        if e["relation"] == "has_variant_effect" and mech_node[e["target"]]["variant_effect"] == "unclear":
            assert e["confidence"] <= 0.4


def test_gap_engine_covers_every_disease_and_missing_files_are_gaps():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    ds = [n["id"] for n in g["nodes"] if n["type"] == "disease"]
    assert set(g["meta"]["gaps"]) == set(ds)
    for gap in g["meta"]["gaps"].values():
        assert gap["route_status"] in ("supported", "hypothesis", "none") and gap["sources"] and gap["suggested_question"]
        if not g["meta"]["curated_counts"]["patient_groups"]:
            assert any("patient group" in m for m in gap["missing"])


def test_curated_loader_accepts_missing_files(tmp_path, monkeypatch):
    import curated
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    assert curated.load("patient_groups") == [] and curated.load("assets") == []


def test_review_v2_sample_is_stratified():
    import csv, common
    p = common.CURATED / "evidence_review_v2.csv"
    if not p.exists():
        pytest.skip("no v2 sample")
    rows = list(csv.DictReader(p.open()))
    assert len(rows) == 24


def test_cluster_stability_reported_over_30_seeds():
    rep, clusters = _cluster_report()
    assert rep["seeds"] == 30 and all("stability" in m for c in clusters for m in c["members"])


def test_every_llm_span_is_in_cached_abstract():
    import json, common
    from spans import verify_span
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    n = 0
    for e in json.loads(p.read_text())["edges"]:
        if e["evidence_type"] != "llm_extracted":
            continue
        _, hit = common.cache_get("pubmed_abs", e["references"][0].removeprefix("PMID:"))
        if hit is None:
            pytest.skip("abstract cache not present")
        assert verify_span(e["quoted_span"], hit["value"]["abstract"]), e["id"]
        assert e["confidence"] in (0.3, 0.4, 0.5, 0.6, 0.7, 0.8)
        n += 1
    assert n >= 8


def test_contradicted_edges_reference_existing_opposing_edges():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    ids = {e["id"] for e in g["edges"]}
    for e in g["edges"]:
        if e["status"] == "contradicted":
            assert e["contradicts"] and set(e["contradicts"]) <= ids


def test_explanation_validator_rejects_invented_ids_and_checks_next_step():
    from spans import validate_explanation
    refs = {"PMID:111", "OMIM:1"}
    good = {"summary_plain": "See PMID: 111.", "steps": [{"text": "x PMID:111", "edge_ids": ["E1"]}], "uncertainties": ["u"],
            "next_step": {"text": "ask", "edge_ids": ["E1"]}}
    assert validate_explanation(good, ["E1"], refs, require_full=True)[0]
    bad_pmid = {**good, "summary_plain": "Reported in PMID 999."}
    assert not validate_explanation(bad_pmid, ["E1"], refs)[0]
    bad_nct = {**good, "steps": [{"text": "trial NCT12345678", "edge_ids": ["E1"]}]}
    assert not validate_explanation(bad_nct, ["E1"], refs)[0]
    bad_next = {**good, "next_step": {"text": "ask", "edge_ids": ["E9"]}}
    assert not validate_explanation(bad_next, ["E1"], refs)[0]
    assert not validate_explanation({**good, "uncertainties": []}, ["E1"], refs, require_full=True)[0]


def test_exported_explanations_cite_only_input_edges():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    ids = {e["id"] for e in g["edges"]}
    assert g["explanations"], "no explanations exported"
    for did, ex in g["explanations"].items():
        cited = {i for s in ex["steps"] + [ex["next_step"]] for i in s["edge_ids"]}
        assert cited <= ids and cited <= set(ex["input_edge_ids"]) and ex["uncertainties"], did


def test_search_resolves_synonyms_symptoms_genes_mechanisms():
    import json
    import common
    p = common.ROOT / "web" / "public" / "data" / "search.json"
    if not p.exists():
        pytest.skip("search index not built")
    items = json.loads(p.read_text())
    types = {i["type"] for i in items}
    assert {"disease", "gene", "symptom", "mechanism"} <= types
    dee4 = next(i for i in items if i["id"] == "OMIM:612164")
    assert "EIEE4" in dee4["aliases"] and "STXBP1" in dee4["aliases"]          # MONDO synonym + gene symbol resolve to the disease
    seiz = next(i for i in items if i["type"] == "symptom" and i["label"] == "Seizure")
    assert len(seiz["diseases"]) >= 8                                          # propagated HPO annotations


def test_curated_usable_splits_genes_and_rejects_bad_rows():
    import curated
    rows = [{"gene": "STXBP1; kcnq2", "organization_name": "Org", "url": "not a url"}, {"gene": "", "organization_name": "x"},
            {"gene": "BRCA1", "organization_name": "y"}, {"gene": "SCN2A", "organization_name": ""}]
    ok, bad = curated.usable("patient_groups", rows, {"STXBP1", "KCNQ2", "SCN2A"})
    assert [r["gene"] for r in ok] == ["STXBP1", "KCNQ2"] and all(r["url"] == "" for r in ok)
    assert len(bad) == 3


def test_curated_data_lights_up_routes(monkeypatch, tmp_path):
    """Fixture rows (clearly fake, .test domain) must produce serves edges and a *supported* route when one group serves two diseases."""
    import csv, curated, export
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    with open(tmp_path / "patient_groups.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["gene", "organization_name", "url"]); w.writerow(["STXBP1;KCNQ2", "FIXTURE GROUP", "https://fixture.test"])
    g = export.build()
    serves = [e for e in g["edges"] if e["relation"] == "serves"]
    assert {e["target"] for e in serves} == {"OMIM:612164", "OMIM:613720"}
    gap = g["meta"]["gaps"]["OMIM:612164"]
    assert any(r["connection"] == "shared_patient_group" and r["connection_status"] == "supported" for r in gap["routes"])
    assert gap["route_status"] == "supported"
    assert not any("patient group" in m for m in gap["missing"])


def test_same_gene_only_routes_are_hypothesis():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    for gap in g["meta"]["gaps"].values():
        for r in gap["routes"]:
            if r["connection"] in ("same_gene", "computed"):
                assert r["connection_status"] == "hypothesis"


def test_investigator_match_labels():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    for e in g["edges"]:
        if e["relation"] == "authored":
            assert (e["match_level"] == "possible") == (e["status"] == "hypothesis")
    inv = [n for n in g["nodes"] if n["type"] == "investigator"]
    assert inv and all(len(n["genes"]) >= 2 for n in inv)


# ---------- Phase 4: entailment overlay, validator extension, review tiers ----------
def _overlay(tmp_path, monkeypatch, claims, verdicts):
    import json, mech
    monkeypatch.setattr(mech, "GRAPH", tmp_path)
    (tmp_path / "mechanisms.json").write_text(json.dumps({"claims": claims}))
    (tmp_path / "entailment.json").write_text(json.dumps({"verdicts": {mech.claim_id({**c, "claim_id": None}): v for c, v in zip(claims, verdicts)}}))
    return mech.load_claims()


def _c(n, effect="loss_of_function", mentions=True, pop="human", conf=0.8):
    return {"gene": "G", "pmid": str(n), "variant_effect": effect, "molecular_function": "other", "linked_phenotype_or_disease": "",
            "quoted_span": f"span number {n} " + "x" * 20, "disease_context": "unspecified", "population": pop,
            "span_mentions_gene": mentions, "confidence": conf}


def test_entailment_overlay_rules(tmp_path, monkeypatch):
    claims = [_c(1), _c(2), _c(3), _c(4), _c(5, effect="unclear", conf=0.4), _c(6, mentions=False)]
    v = lambda e, p: {"entailment": e, "population": p, "rationale": "r"}
    out = _overlay(tmp_path, monkeypatch, claims, [v("yes", "human"), v("partial", "human"), v("no", "human"), v("yes", "in_vitro"),
                                                   v("yes", "human"), v("yes", "human")])
    yes_h, partial, no, yes_vitro, unclear, nomention = out
    assert (yes_h["variant_effect"], yes_h["confidence"], yes_h["entailment"]) == ("loss_of_function", 0.8, "yes")
    assert (partial["variant_effect"], partial["confidence"]) == ("loss_of_function", 0.6)          # 0.8 - 0.2
    assert no["variant_effect"] == "unclear" and no["confidence"] <= 0.4 and no["extracted_variant_effect"] == "loss_of_function"
    assert yes_vitro["population"] == "in_vitro" and yes_vitro["confidence"] == 0.7                    # span population, not extractor's
    assert unclear["entailment"] == "not_checked" and unclear["confidence"] <= 0.4                     # unclear is never checked / raised
    assert nomention["confidence"] == 0.5
    import mech
    assert mech.claim_id(no) == mech.claim_id({**_c(3), "claim_id": None})                              # id stays the original extraction id


def test_unclear_after_no_is_excluded_from_profiles(tmp_path, monkeypatch):
    import mech
    claims = [_c(i) for i in range(1, 5)]
    out = _overlay(tmp_path, monkeypatch, claims, [{"entailment": "no", "population": "human", "rationale": "r"}] * 4)
    assert mech.profile(out) is None and mech.dominant_effect(out) is None


def test_effect_assertions_and_negation():
    from spans import effect_assertions as ea
    assert ea("variants cause loss of function") == {"reduced"}
    assert ea("gain-of-function variants") == {"increased"}
    assert ea("too much activity, rather than a loss of function") == set()
    assert ea("both LoF and gain of function were seen") == {"reduced", "increased"}
    assert ea("STXBP1 causes seizures") == set()


def test_validator_requires_entailed_claim_for_effect_steps():
    from spans import validate_explanation
    info = {"M1": {"variant_effect": "loss_of_function", "entailment": "no"}, "M2": {"variant_effect": "loss_of_function", "entailment": "yes"},
            "M3": {"variant_effect": "gain_of_function", "entailment": "yes"}, "E1": None}
    info = {k: v for k, v in info.items() if v}
    mk = lambda text, ids: {"steps": [{"text": text, "edge_ids": ids}], "uncertainties": ["u"], "summary_plain": "s", "next_step": {"text": "ask", "edge_ids": ["E1"]}}
    ids = ["M1", "M2", "M3", "E1"]
    assert not validate_explanation(mk("This points to loss of function.", ["M1"]), ids, claim_info=info)[0]       # entailment=no
    assert validate_explanation(mk("This points to loss of function.", ["M1", "M2"]), ids, claim_info=info)[0]
    assert not validate_explanation(mk("This points to gain of function.", ["M2"]), ids, claim_info=info)[0]       # wrong class
    assert validate_explanation(mk("It is similar to other diseases.", ["M1"]), ids, claim_info=info)[0]           # no effect asserted
    both = mk("Evidence conflicts: loss of function versus gain of function.", ["M2", "M3"])
    assert validate_explanation(both, ids, claim_info=info)[0]
    assert not validate_explanation(mk("Evidence conflicts: loss of function versus gain of function.", ["M2"]), ids, claim_info=info)[0]


def test_graph_entailment_consistency():
    import json, common
    p = common.GRAPH / "graph.json"
    if not p.exists() or not (common.GRAPH / "entailment.json").exists():
        pytest.skip("graph/entailment not built")
    g = json.loads(p.read_text())
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    n_checked = 0
    for e in g["edges"]:
        if e["relation"] != "has_variant_effect":
            continue
        eff = nodes[e["target"]]["variant_effect"]
        if e["entailment"] == "no":
            assert eff == "unclear" and e["confidence"] <= 0.4
        if e["entailment"] == "partial":
            assert e["confidence"] in (0.3, 0.5, 0.6)
        if e["entailment"] in ("yes", "partial"):
            n_checked += 1
            assert eff == e["extracted_variant_effect"]
    assert n_checked > 100
    for e in g["edges"]:                                    # shared-mechanism edges rest on directional (non-"unclear") claims only
        if e["relation"] == "shares_mechanism_with":
            assert e["supporting_edge_ids"]
            assert all(nodes[edges[i]["target"]]["variant_effect"] != "unclear" for i in e["supporting_edge_ids"])


def test_exported_explanations_assert_effects_only_with_entailed_claims():
    import json, common
    from spans import effect_assertions, REDUCED, INCREASED
    p = common.GRAPH / "graph.json"
    if not p.exists():
        pytest.skip("graph not built")
    g = json.loads(p.read_text())
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    for did, ex in g["explanations"].items():
        for st in ex["steps"] + [ex["next_step"]]:
            yes = [nodes[edges[i]["target"]]["variant_effect"] for i in st["edge_ids"] if edges[i]["relation"] == "has_variant_effect" and edges[i]["entailment"] == "yes"]
            a = effect_assertions(st["text"])
            if "reduced" in a: assert set(yes) & REDUCED, (did, st["text"])
            if "increased" in a: assert set(yes) & INCREASED, (did, st["text"])


def test_review_v2_uses_post_check_tiers():
    import csv, json, common
    p = common.CURATED / "evidence_review_v2.csv"
    gp = common.GRAPH / "graph.json"
    if not p.exists() or not gp.exists():
        pytest.skip("not built")
    g = json.loads(gp.read_text())
    ids = {e["id"]: e for e in g["edges"]}
    rows = list(csv.DictReader(p.open()))
    tier = lambda c: "0.8" if c >= 0.8 else "0.7" if c >= 0.7 else "<0.7"
    from collections import Counter
    cnt = Counter(tier(ids[r["edge_id"]]["confidence"]) for r in rows)      # edge ids are stable hashes of the original claim
    assert cnt == {"0.8": 8, "0.7": 8, "<0.7": 8}
    assert len({ids[r["edge_id"]]["source"] for r in rows}) == 9


def test_methods_and_10x_pages_exist():
    import common
    assert (common.ROOT / "web" / "app" / "methods" / "page.tsx").exists()
    assert (common.ROOT / "web" / "app" / "10x" / "page.tsx").exists()
