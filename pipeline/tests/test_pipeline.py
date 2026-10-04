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


def test_explanation_style_rule():
    ok = {"summary_plain": "Research papers show STXBP1 can cause this disease.", "steps": [{"text": "We found one link.", "edge_ids": ["E1"]}],
          "uncertainties": ["Not sure."], "next_step": {"text": "Ask an expert.", "edge_ids": ["E1"]}}
    assert validate_explanation(ok, ["E1"], require_full=True)[0]
    bad = {**ok, "summary_plain": "The graph says STXBP1 can cause this disease."}
    good, errs = validate_explanation(bad, ["E1"], require_full=True)
    assert not good and any(e.startswith("style:") for e in errs)


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
        w = csv.writer(f); w.writerow(["gene", "organization_name", "url", "verified"]); w.writerow(["STXBP1;KCNQ2", "FIXTURE GROUP", "https://fixture.test", "yes"])
    g = export.build()
    serves = [e for e in g["edges"] if e["relation"] == "serves"]
    assert {e["target"] for e in serves} == {"OMIM:612164", "OMIM:613720", "OMIM:121200"}      # every disease of the gene, benign BFNS1 included
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
            assert eff == e["extracted_variant_effect"] or e.get("human_demoted")
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


def test_edges_lite_covers_every_edge_for_the_drawer():
    import json, common
    gp, lp = common.GRAPH / "graph.json", common.ROOT / "web" / "public" / "data" / "edges.json"
    if not gp.exists() or not lp.exists():
        pytest.skip("not built")
    g, lite = json.loads(gp.read_text()), json.loads(lp.read_text())
    assert set(lite) == {e["id"] for e in g["edges"]}
    for i, e in lite.items():
        assert e["status"] in ("supported", "contradicted", "hypothesis") and "relation" in e
        for c in e.get("contradicts", []):
            assert c in lite                                   # drawer can show both sides of a conflict


def test_glossary_regex_and_live_flag_files_exist():
    import common
    web = common.ROOT / "web"
    assert "loss of function" in (web / "lib" / "glossary.ts").read_text()
    route = (web / "app" / "api" / "explain" / "route.ts").read_text()
    assert "export async function GET" in route and "live:" in route          # UI hides the live feature when not configured
    assert "503" in route


# ---------- verification protocol ----------
def test_unverified_curated_rows_never_create_supported_routes(monkeypatch, tmp_path):
    import csv, curated, export
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    with open(tmp_path / "patient_groups.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["gene", "organization_name", "url", "verified"])
        w.writerow(["STXBP1;KCNQ2", "FIXTURE GROUP", "https://fixture.test", "no"])
    g = export.build()
    serves = [e for e in g["edges"] if e["relation"] == "serves"]
    assert serves and all(e["status"] == "hypothesis" and e["verified"] is False for e in serves)
    gap = g["meta"]["gaps"]["OMIM:612164"]
    assert gap["route_status"] != "supported" and not any(r["connection"] == "shared_patient_group" for r in gap["routes"])
    assert any("not yet verified" in m for m in gap["missing"])


def test_only_verified_yes_rows_count_in_review_stats(monkeypatch, tmp_path):
    import csv, json, common, curated, export
    g0 = json.loads((common.GRAPH / "graph.json").read_text())
    claims = [e for e in g0["edges"] if e["relation"] == "has_variant_effect" and not e.get("human_demoted")][:4]
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    cols = curated.FILES["evidence_review"] + ["verified", "second_verdict", "final_verdict", "verified_by", "second_by"]
    with open(tmp_path / "evidence_review_v2.csv", "w", newline="") as f:
        w = csv.DictWriter(f, cols); w.writeheader()
        for i, e in enumerate(claims):
            w.writerow({"edge_id": e["id"], "gene": "X", "claim": "loss of function / other (human; disease: unspecified; confidence 0.8)", "quoted_span": e["quoted_span"],
                        "pmid": e["references"][0].removeprefix("PMID:"), "verdict": "correct", "final_verdict": "correct",
                        "verified": "yes" if i < 2 else ("no" if i == 2 else ""), "second_verdict": "correct" if i == 0 else "incorrect" if i == 1 else "",
                        "verified_by": "A", "second_by": "B"})
    g = export.build()
    ro = g["meta"]["review_overall"]
    assert ro["reviewed"] == 2                                              # unverified / blank rows carry no weight
    ag = g["meta"]["review_agreement"]
    assert ag["n_double_reviewed"] == 2 and ag["agree"] == 1 and ag["percent_agreement"] == 0.5


def test_agreement_stats_and_kappa():
    import export
    assert export.agreement_stats([])["percent_agreement"] is None
    perfect = export.agreement_stats([("correct", "correct"), ("incorrect", "incorrect"), ("partial", "partial")])
    assert perfect["percent_agreement"] == 1.0 and perfect["cohens_kappa"] == 1.0
    mixed = export.agreement_stats([("correct", "correct"), ("correct", "incorrect"), ("incorrect", "incorrect"), ("incorrect", "correct")])
    assert mixed["percent_agreement"] == 0.5 and mixed["cohens_kappa"] == 0.0


def test_curated_files_follow_protocol_columns():
    import csv, common
    need = {"patient_groups": ["verified", "verified_by", "verified_at"], "assets": ["verified", "verified_by", "verified_at"],
            "evidence_review_v2": ["verified", "verified_by", "verified_at", "second_verdict", "second_by"]}
    for name, cols in need.items():
        p = common.CURATED / f"{name}.csv"
        if not p.exists():
            continue
        rows = list(csv.DictReader(p.open(encoding="utf-8-sig")))
        assert all(c in rows[0] for c in cols), name
        for r in rows:
            for k in ("date_checked", "verified_at"):
                if r.get(k):
                    assert len(r[k]) == 10 and r[k][4] == "-", (name, k, r[k])   # ISO dates
            assert r["verified"] in ("yes", "no", "")
    pg = list(csv.DictReader((common.CURATED / "patient_groups.csv").open(encoding="utf-8-sig"))) if (common.CURATED / "patient_groups.csv").exists() else []
    assert all(r["verified"] == "yes" for r in pg) or not pg


def test_review_packet_hides_scores_and_verdicts():
    import common
    p = common.ROOT / "docs" / "review_packet.md"
    if not p.exists():
        pytest.skip("no packet")
    t = p.read_text()
    assert t.count("## Row ") == 24
    body = t.split("## Row 1", 1)[1]
    structural = [l for l in body.splitlines() if l.startswith(("- **", "## Row"))]     # abstracts may contain any word; our own lines may not
    for l in structural:
        for banned in ("entailment", "confidence", "verdict", "correct"):      # "correct" also covers "incorrect"
            assert banned not in l.lower(), (banned, l)
    assert "verdict:" not in body.lower()


def test_theme_defaults_to_light_ignores_os_and_keeps_dark_tokens():
    import common
    web = common.ROOT / "web"
    boot = (web / "lib" / "theme-boot.ts").read_text()
    assert "prefers-color-scheme" not in boot and "matchMedia" not in boot          # first visit: light, never the OS preference
    assert 'dataset.theme=(t==="dark"||t==="light")?t:"light"' in boot
    css = (web / "app" / "globals.css").read_text()
    root = css.split(":root {", 1)[1].split("}", 1)[0]
    assert "--bg: #f7f9fc" in root and "--ok: #15803d" in root and "--hyp: #b45309" in root and "--conf: #be185d" in root and "--accent: #0e7490" in root
    dark = css.split(':root[data-theme="dark"] {', 1)[1].split("}", 1)[0]
    for tok in ("--bg: #0a0e1a", "--surface: #121829", "--ink: #e6eaf2", "--muted: #8b93a7", "--ok: #4ade80", "--hyp: #fbbf24", "--conf: #f472b6", "--accent: #22d3ee"):
        assert tok in dark, tok                                                      # dark tokens unchanged
    layout = (web / "app" / "layout.tsx").read_text()
    assert "THEME_BOOT" in layout and "<head><script" in layout                       # inline in <head>: set before first paint
    assert "aria-label" in (web / "components" / "ThemeToggle.tsx").read_text()


def test_no_hard_coded_hex_colours_in_components():
    import re, common
    web = common.ROOT / "web"
    for p in list((web / "components").rglob("*.tsx")) + list((web / "app").rglob("*.tsx")):
        assert not re.search(r'(fill|stroke|color|borderColor)=?[:=]\s*[{"\']?#[0-9a-fA-F]{3,8}', p.read_text()), p.name     # colours come from theme variables


# ---------- Phase 5 integration: review protocol, packet, routes ----------
def test_packet_claim_equals_csv_claim_for_every_row():
    import csv, common, make_review_packet as mp
    pk = (common.ROOT / "docs" / "review_packet.md").read_text()
    rows = list(csv.DictReader((common.CURATED / "evidence_review_v2.csv").open(encoding="utf-8-sig")))
    blocks = pk.split("## Row ")[1:]
    assert len(blocks) == len(rows) == 24
    for n, (blk, r) in enumerate(zip(blocks, rows), 1):
        line = next(l for l in blk.splitlines() if l.startswith("- **Claim:**"))
        assert line == "- **Claim:** " + mp.claim_sentence(r["gene"], r["claim"]), n
        if r["claim"].startswith("unclear"):                       # demoted rows: the CURRENT claim, not the original extracted effect
            assert "direction is not stated" in line, n
    assert "direction is not stated" in blocks[17]                  # row 18 (KCNQ2, demoted)


def test_review_stats_use_final_verdict_tiers_demotion_and_two_human_agreement():
    import json, common
    m = json.loads((common.GRAPH / "graph.json").read_text())["meta"]
    rev = m["review_precision_by_tier"]
    assert sum(t["reviewed"] for t in rev.values()) + m["review_demotion_check"]["n"] == 24
    assert m["review_demotion_check"]["n"] == 5 and set(m["review_demotion_check"]["rows"]) == {"M04bcaa04", "Mddba61b7", "Mea31541b", "Mf978aa61", "M0a8335dc"}
    ag = m["review_agreement"]
    assert ag["n_double_reviewed"] == 24 and ag["agree"] == 14 and ag["percent_agreement"] == 0.583 and "two human reviewers" in ag["label"]
    for t in rev.values():
        assert t["correct"] + t["partial"] + t["incorrect"] == t["reviewed"]


def test_incorrect_final_verdict_is_demoted_partial_is_kept_with_reason():
    import json, common
    g = json.loads((common.GRAPH / "graph.json").read_text())
    nodes = {n["id"]: n for n in g["nodes"]}
    edges = {e["id"]: e for e in g["edges"]}
    e = edges["Mf2026d98"]                                          # final_verdict incorrect
    assert e["human_demoted"] and nodes[e["target"]]["variant_effect"] == "unclear" and e["confidence"] <= 0.4
    p = edges["M1ae0c78c"]                                          # final_verdict partial: keeps status, shows the reviewers' reason
    assert not p["human_demoted"] and p["review"]["final"] == "partial" and p["review"]["notes"]


def test_review_columns_never_modified_by_the_build():
    import csv, common, hashlib
    rows = list(csv.DictReader((common.CURATED / "evidence_review_v2.csv").open(encoding="utf-8-sig")))
    assert all(r["final_verdict"] in ("correct", "partial", "incorrect") for r in rows) and all(r["verified"] == "yes" for r in rows)


def test_routes_have_four_segments_overall_is_the_weakest_and_opposites_hide_groups():
    import json, common
    g = json.loads((common.GRAPH / "graph.json").read_text())
    rank = {"supported": 3, "pending": 2, "hypothesis": 1, "missing": 0}
    for did, gap in g["meta"]["gaps"].items():
        assert set(gap["route_segments"]) == {"own_community", "link", "related_community", "shared_asset"}
        for r in gap["routes"]:
            assert r["overall"] == min(r["segments"].values(), key=lambda v: rank[v])
            if r["opposite_mechanisms"]:                              # never recommend a community across opposite mechanisms
                assert r["segments"]["related_community"] == "missing" and r["leads"]["patient_groups"] == []
        assert gap["route_overall"] == max((r["overall"] for r in gap["routes"]), key=lambda v: rank[v], default="missing")


def test_scn1a_never_gets_an_scn8a_group_recommended():
    import json, common
    g = json.loads((common.GRAPH / "graph.json").read_text())
    nodes = {n["id"]: n for n in g["nodes"]}
    gap = g["meta"]["gaps"]["OMIM:607208"]                           # SCN1A Dravet: loss of function
    assert gap["route_segments"]["own_community"] == "missing"
    for r in gap["routes"]:
        if r["dominant"]["there"] == "gain_of_function":
            assert r["opposite_mechanisms"] and not r["leads"]["patient_groups"]
    html = common.ROOT / "web" / ".next" / "server" / "app" / "disease" / "OMIM_607208.html"
    if html.exists():
        import re
        text = html.read_text()
        own = re.search(r'\\"id\\":\\"OMIM:607208\\".*?\\"summary\\":\\"(.*?)\\"', text)   # this page's own one-sentence summary in the map data
        assert own and "Cute Syndrome" not in own.group(1) and "No patient group for SCN1A" in own.group(1)
        assert "Copy a message to The Cute Syndrome Foundation" not in text and "No patient group on file for" in text


def test_patient_groups_serve_every_disease_of_their_gene_including_benign_forms():
    import json, common
    from config import ALL
    g = json.loads((common.GRAPH / "graph.json").read_text())
    serves = [e for e in g["edges"] if e["relation"] == "serves"]
    org_genes = {n["id"]: set(n["genes"]) for n in g["nodes"] if n["type"] == "patient_org"}
    for oid, genes in org_genes.items():
        got = {e["target"] for e in serves if e["source"] == oid}
        want = {d for d, gene in ALL.items() if gene in genes}
        assert got == want, oid
    assert any(e["target"] in ("OMIM:607745", "OMIM:617080", "OMIM:121200") for e in serves)     # benign forms are linked


def test_shares_study_links_and_verified_is_the_only_source_of_truth(monkeypatch, tmp_path):
    import csv, curated, export, json, common
    g = json.loads((common.GRAPH / "graph.json").read_text())
    ss = [e for e in g["edges"] if e["relation"] == "shares_study_with"]
    ids = {(e["study_id"], tuple(sorted(e["genes"]))) for e in ss}
    assert ("NCT06555965", ("STXBP1", "SYNGAP1")) in ids and ("NCT05818553", ("SCN2A", "SCN8A")) in ids
    # fixture: both genes' STARR rows verified -> supported; one unverified -> pending; the 'status' column (study status) is irrelevant
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    def write(v2):
        with open(tmp_path / "assets.csv", "w", newline="") as f:
            w = csv.writer(f); w.writerow(["gene", "asset_type", "name", "identifier", "source_url", "status", "date_checked", "verified"])
            w.writerow(["STXBP1", "natural_history_study", "FIXTURE STUDY", "NCT00000001", "https://fixture.test", "RECRUITING", "2026-10-04", "yes"])
            w.writerow(["SYNGAP1", "natural_history_study", "FIXTURE STUDY", "NCT00000001", "https://fixture.test", "RECRUITING", "2026-10-04", v2])
    write("yes")
    ok = [e for e in export.build()["edges"] if e["relation"] == "shares_study_with"]
    assert ok and all(e["status"] == "supported" and not e["pending_verification"] for e in ok)
    write("no")
    pend = [e for e in export.build()["edges"] if e["relation"] == "shares_study_with"]
    assert pend and all(e["status"] == "hypothesis" and e["pending_verification"] for e in pend)
    gap = export.build()["meta"]["gaps"]["OMIM:612164"]
    r = next(r for r in gap["routes"] if r["connection"] == "shares_study")
    assert r["segments"]["link"] == "pending" and r["overall"] in ("pending", "missing")


# ---------- final fixes: Copy-message To:, treatment wording, verified study assets ----------
def _messages(page_id):
    import re, common
    html = common.ROOT / "web" / ".next" / "server" / "app" / "disease" / f"{page_id}.html"
    if not html.exists():
        pytest.skip("web not built")
    t = html.read_text()
    out = {}
    for m in re.finditer(r"To: (.*?)(?:\\n|\n)Subject: Possible shared ground between .*? and (.*?)(?:\\n|\n)", t):
        out.setdefault(m.group(2), set()).add(m.group(1))
    return out


def _groups_by_gene():
    import csv, common
    by = {}
    for r in csv.DictReader((common.CURATED / "patient_groups.csv").open(encoding="utf-8-sig")):
        if r["verified"] == "yes":
            for g in r["gene"].replace(",", ";").split(";"):
                by.setdefault(g.strip().upper(), set()).add(r["organization_name"])
    return by


def test_copy_message_to_line_prefills_only_the_verified_group_of_the_right_gene():
    by = _groups_by_gene()
    msgs = _messages("OMIM_612164")                                   # STXBP1 (loss of function)
    syn = next(v for k, v in msgs.items() if k.startswith("SYNGAP1"))
    assert syn and syn <= by["SYNGAP1"]                                       # STXBP1 -> SYNGAP1 via STARR -> To: CURE SYNGAP1
    assert any("CURE SYNGAP1" in x for x in syn)
    scn2a = next(v for k, v in msgs.items() if k.startswith("SCN2A"))  # shares a study (Simons) but gain of function: opposite mechanisms -> blank
    assert all(x.startswith("a SCN2A patient community") for x in scn2a)
    gnao1 = next(v for k, v in msgs.items() if k.startswith("GNAO1"))  # phenotype-only (computed) link -> blank
    assert all(x.startswith("a GNAO1 patient community") for x in gnao1)
    benign = _messages("OMIM_613721")                                   # SCN2A DEE11 page: same-gene benign partner -> the own-gene group
    same = next(v for k, v in benign.items() if k.startswith("SCN2A") and "benign" in k.lower())
    assert same and same <= by["SCN2A"]
    # every pre-filled recipient anywhere is a verified group; SCN1A has no own group, so nothing is pre-filled
    allgroups = set().union(*by.values())
    for page in ("OMIM_612164", "OMIM_613721", "OMIM_614558", "OMIM_607208"):
        for tos in _messages(page).values():
            for to in tos:
                assert to in allgroups or to.startswith("a ") and "no verified group" in to, (page, to)
    for tos in _messages("OMIM_607208").values():
        assert all(t.startswith("a ") for t in tos)
    scn2a_page = _messages("OMIM_613721")                             # SCN2A <-> SCN8A via EMBOLD, both gain of function: SCN8A group allowed
    scn8a = next(v for k, v in scn2a_page.items() if k.startswith("SCN8A"))
    assert scn8a and scn8a <= by["SCN8A"]


def test_explanations_never_imply_no_treatment_exists():
    import json, re, common
    g = json.loads((common.GRAPH / "graph.json").read_text())
    note = "This atlas does not track treatments. Ask your care team about current treatment options."
    for did, ex in g["explanations"].items():
        for u in ex["uncertainties"]:
            assert not re.search(r"\btreatments?\b", u, re.I) or u == note, (did, u)
        assert ex["uncertainties"], did
    assert any(note in ex["uncertainties"] for ex in g["explanations"].values())
    ids = {e["id"] for e in g["edges"]}
    for ex in g["explanations"].values():                                # edge citations untouched
        assert {i for s in ex["steps"] + [ex["next_step"]] for i in s["edge_ids"]} <= ids


def test_treatment_postprocessing_keeps_other_uncertainties():
    import explain
    out = explain.no_treatment_claims({"uncertainties": ["We do not have treatment results for this condition.",
                                                          "Asset rows are not verified. The records do not give treatment results.", "Links are only hypotheses, not to be treated as proof."]})
    assert out["uncertainties"] == ["Asset rows are not verified.", "Links are only hypotheses, not to be treated as proof.", explain.TREATMENT_NOTE]


def test_verified_study_assets_make_the_stxbp1_route_fully_supported(monkeypatch, tmp_path):
    """Simulates Varduhi's verified rows for STARR, EMBOLD, FENDEEP and Simons Searchlight on a COPY of assets.csv."""
    import csv, shutil, curated, export, common
    for f in ("patient_groups.csv", "assets.csv"):
        shutil.copy(common.CURATED / f, tmp_path / f)
    rows = list(csv.DictReader((tmp_path / "assets.csv").open(encoding="utf-8-sig")))
    for r in rows:
        if r["identifier"] in ("NCT06555965", "NCT05818553", "NCT05232630", "NCT01238250"):
            r["verified"], r["verified_by"], r["verified_at"] = "yes", "Varduhi", "2026-10-04"
    with open(tmp_path / "assets.csv", "w", newline="") as f:
        w = csv.DictWriter(f, list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    monkeypatch.setattr(curated, "CURATED", tmp_path)
    g = export.build()
    gap = g["meta"]["gaps"]["OMIM:612164"]
    assert gap["route_overall"] == "supported" and set(gap["route_segments"].values()) == {"supported"}
    study = [e for e in g["edges"] if e["relation"] == "shares_study_with"]
    assert study and all(e["status"] == "supported" and not e["pending_verification"] for e in study)
    scn2a = g["meta"]["gaps"]["OMIM:613721"]["route_overall"]
    assert scn2a == "supported"                                        # EMBOLD verified: SCN2A <-> SCN8A


def test_real_verified_assets_give_stxbp1_a_fully_supported_route():
    import csv, json, common
    rows = list(csv.DictReader((common.CURATED / "assets.csv").open(encoding="utf-8-sig")))
    star = [r for r in rows if r["identifier"] in ("NCT06555965",)]
    if not star or not all(r["verified"] == "yes" for r in star):
        pytest.skip("STARR rows not verified yet")
    g = json.loads((common.GRAPH / "graph.json").read_text())
    gap = g["meta"]["gaps"]["OMIM:612164"]
    assert gap["route_overall"] == "supported" and set(gap["route_segments"].values()) == {"supported"}
    assert not any(e["status"] == "hypothesis" for e in g["edges"] if e["relation"] == "has_asset" and e.get("verified"))


def test_10x_page_footer_formula_labels_and_atlas_timing():
    import common
    src = (common.ROOT / "web" / "app" / "10x" / "page.tsx").read_text()
    assert "Text drafted with AI help; sources checked by Varduhi." in src and "source-checked by Varduhi" not in src
    assert 'className="sr-only">{line}' not in src and 'role="img" aria-label={line}' in src       # the formula is rendered once, as a fraction
    assert "Our own timing" in src and "same 2 hours as step 1" in src                           # steps 1-2 -> Measured
    assert "Atlas side: about 0.15 s to show the groups and studies for STXBP1 (median of 5 page loads, measured 2026-10-04)." in src
    md = (common.ROOT / "web" / "content" / "10x.md").read_text()
    assert "Overall speed-up = (D + 36 + recruitment time) / (36 + recruitment time)" in md and not (common.CURATED / "10x.md").exists()
