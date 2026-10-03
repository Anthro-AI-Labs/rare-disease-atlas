"""Quoted-span verification (CLAUDE.md rule 2) and explanation edge-id validation (rule 4)."""
import re


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def verify_span(span, abstract):
    """True iff span is a non-trivial exact substring of abstract after whitespace normalisation."""
    s = norm(span)
    return len(s) >= 15 and s in norm(abstract)


def validate_explanation(expl, path_edge_ids):
    """Return (ok, errors). Every step must cite >=1 edge id, all of which are in the input path."""
    allowed, errs = set(path_edge_ids), []
    for i, st in enumerate(expl.get("steps", [])):
        ids = st.get("edge_ids", [])
        if not ids:
            errs.append(f"step {i}: no edge_ids")
        errs += [f"step {i}: unknown edge id {e}" for e in ids if e not in allowed]
    return not errs, errs
