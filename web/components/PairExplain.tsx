"use client";
import { useEffect, useState } from "react";
import { Glossed } from "@/components/Term";
import { strip } from "@/components/Explanation";

type R = { summary_plain: string; uncertainties: string[]; source: string };

/** Live "explain this link" for a pair that has no pre-generated text. Hidden entirely when the server has no OpenAI config;
 *  any failure collapses to a calm note, never an error state. */
export default function PairExplain({ edgeIds, label }: { edgeIds: string[]; label: string }) {
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<R | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { fetch("/api/explain").then((r) => r.json()).then((d) => setLive(!!d.live)).catch(() => setLive(false)); }, []);
  if (!live) return null;
  async function go() {
    setBusy(true); setNote("");
    try {
      const r = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ edgeIds }) });
      if (r.status === 503) { setLive(false); return; }
      if (!r.ok) { setNote("Not available right now. The explanation above still applies."); return; }
      setRes(await r.json());
    } catch { setLive(false); } finally { setBusy(false); }
  }
  return (
    <div className="mt-3">
      {!res && <button type="button" onClick={go} disabled={busy} className="btn btn-ghost !px-4 !py-1.5 text-sm" aria-label={`Explain the link with ${label} in plain words`}>{busy ? "Explaining…" : "Explain this link in plain words"}</button>}
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
      {res && (
        <div className="mt-2 rounded-xl bg-surface2 p-4 text-sm">
          <p><Glossed text={strip(res.summary_plain)} /></p>
          {res.uncertainties[0] && <p className="mt-2 text-muted">Unsure: <Glossed text={strip(res.uncertainties[0])} /></p>}
          <p className="mt-2 text-xs text-muted">{res.source === "llm" ? "Written live by AI from the evidence for this link; checked automatically." : "Template list."} Not medical advice.</p>
        </div>)}
    </div>
  );
}
