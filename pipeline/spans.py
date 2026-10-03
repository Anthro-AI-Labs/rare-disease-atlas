"""Quoted-span verification (CLAUDE.md rule 2) and explanation edge-id validation (rule 4)."""
import re


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def verify_span(span, abstract):
    """True iff span is a non-trivial exact substring of abstract after whitespace normalisation."""
    s = norm(span)
    return len(s) >= 15 and s in norm(abstract)


ID_RE = re.compile(r"\b(PMID:?\s*\d+|NCT\d{8}|OMIM:\d+|HP:\d{7}|MONDO:\d+)\b")


def validate_explanation(expl, path_edge_ids, allowed_refs=None, require_full=False):
    """Return (ok, errors). Every step (and next_step) must cite >=1 edge id, all in the input path. If allowed_refs is given, any
    PMID/NCT/OMIM/HP/MONDO identifier written in the text must be in that set (no invented identifiers). require_full also demands
    a summary, >=1 step and >=1 uncertainty."""
    allowed, errs = set(path_edge_ids), []
    steps = list(expl.get("steps", []))
    ns = expl.get("next_step")
    if ns:
        steps.append({**ns, "_label": "next_step"})
    for i, st in enumerate(steps):
        lab = st.get("_label", f"step {i}")
        ids = st.get("edge_ids", [])
        if not ids:
            errs.append(f"{lab}: no edge_ids")
        errs += [f"{lab}: unknown edge id {e}" for e in ids if e not in allowed]
    if allowed_refs is not None:
        texts = [expl.get("summary_plain", ""), *expl.get("uncertainties", []), *(st.get("text", "") for st in steps)]
        for t in texts:
            for m in ID_RE.findall(t):
                if re.sub(r"[\s]", "", m).replace("PMID", "PMID:").replace("PMID::", "PMID:") not in allowed_refs:
                    errs.append(f"identifier not in input: {m}")
    if require_full:
        if not expl.get("summary_plain"): errs.append("missing summary_plain")
        if not expl.get("steps"): errs.append("no steps")
        if not expl.get("uncertainties"): errs.append("no uncertainties")
        if not ns: errs.append("missing next_step")
    return not errs, errs
