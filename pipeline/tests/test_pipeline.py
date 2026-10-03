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


def test_counterexample_never_silently_clusters_with_own_gene_dee():
    """Benign counterexample must be in a different cluster from its gene's DEE, or both must be flagged uncertain."""
    rep, clusters = _cluster_report()
    members = {m["id"]: m for c in clusters for m in c["members"]}
    cl = {m["id"]: c["cluster"] for c in clusters for m in c["members"]}
    assert rep["counterexample_pairs"]
    for pr in rep["counterexample_pairs"]:
        a, b = pr["counterexample"], pr["core"]
        if cl[a] == cl[b]:
            assert members[a]["uncertain"] and members[b]["uncertain"], f"{pr['gene']} benign/DEE co-cluster unflagged"


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
        assert e["confidence"] in (0.5, 0.7, 0.8)
        n += 1
    assert n >= 8
