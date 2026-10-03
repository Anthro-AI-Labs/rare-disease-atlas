"""Shared helpers: repo paths, .env, disk cache, throttled NCBI access."""
import hashlib, json, os, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "cache"
GRAPH = ROOT / "data" / "graph"
CURATED = ROOT / "data" / "curated"
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass


def cache_get(ns, key):
    p = CACHE / ns / (hashlib.sha256(key.encode()).hexdigest()[:24] + ".json")
    return p, (json.loads(p.read_text()) if p.exists() else None)


def cached(ns, key, fn):
    """Return fn() result, cached on disk by (namespace, key); never re-calls on rerun."""
    p, hit = cache_get(ns, key)
    if hit is not None:
        return hit["value"]
    val = fn()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"key": key, "value": val}))
    return val


_last = {}
def throttle(name, per_sec):
    gap = 1.0 / per_sec
    wait = _last.get(name, 0) + gap - time.time()
    if wait > 0:
        time.sleep(wait)
    _last[name] = time.time()


def ncbi_params(extra=None):
    """E-utilities params. api_key is omitted entirely when unset (empty value => 'API key invalid')."""
    p = {"tool": "rare-disease-atlas"}
    if os.getenv("NCBI_EMAIL"):
        p["email"] = os.environ["NCBI_EMAIL"]
    if os.getenv("NCBI_API_KEY"):
        p["api_key"] = os.environ["NCBI_API_KEY"]
    return {**p, **(extra or {})}


def ncbi_get(endpoint, params):
    throttle("ncbi", 10 if os.getenv("NCBI_API_KEY") else 3)
    r = requests.get(f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/{endpoint}",
                     params=ncbi_params(params), timeout=60)
    r.raise_for_status()
    return r
