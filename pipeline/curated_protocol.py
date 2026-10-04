"""One-off, idempotent migration to the verification protocol for data/curated/*.csv.
Adds verified / verified_by / verified_at (and second_verdict / second_by for evidence_review_v2), normalises date_checked to ISO,
and pre-fills ONLY the facts stated by the project lead. It never writes a verdict and never overwrites a non-empty cell."""
import csv, datetime, re, sys
from common import CURATED

V = ["verified", "verified_by", "verified_at"]
SECOND = ["second_verdict", "second_by"]
LEAD = {"verified": "yes", "verified_by": "Varduhi", "verified_at": "2026-10-04"}


def iso(s):
    s = (s or "").strip()
    if not s or re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%d.%m.%Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            return datetime.datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            pass
    print(f"WARNING: could not normalise date {s!r}", file=sys.stderr)
    return s


def migrate(name, extra, prefill):
    p = CURATED / f"{name}.csv"
    with open(p, newline="", encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        fields, rows = list(rd.fieldnames), list(rd)
    for c in extra:
        if c not in fields:
            fields.append(c)
    for i, r in enumerate(rows, 1):
        for c in extra:
            r.setdefault(c, "")
            r[c] = r[c] or ""
        if "date_checked" in r:
            r["date_checked"] = iso(r["date_checked"])
        for c, v in prefill(i, r).items():
            if not r[c]:
                r[c] = v
    with open(p, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fields, lineterminator="\n")
        w.writeheader(); w.writerows(rows)
    print(name, len(rows), "rows;", sum(r["verified"] == "yes" for r in rows), "verified=yes;", sum(r["verified"] == "no" for r in rows), "verified=no")


if __name__ == "__main__":
    migrate("patient_groups", V, lambda i, r: dict(LEAD))
    migrate("assets", V, lambda i, r: {"verified": "no"})
    migrate("evidence_review_v2", V + SECOND, lambda i, r: dict(LEAD) if i <= 12 else {"verified": "no"})
