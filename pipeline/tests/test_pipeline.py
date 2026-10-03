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
