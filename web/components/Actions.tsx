"use client";
import { useState } from "react";

/** Copies a templated message (facts and sources from graph.json only). {ATLAS_URL} becomes this site's address. */
export function CopyMessage({ text, label, preview = true }: { text: string; label: string; preview?: boolean }) {
  const [done, setDone] = useState<"" | "ok" | "fail">("");
  const body = () => text.replaceAll("{ATLAS_URL}", window.location.origin);
  async function copy() {
    try { await navigator.clipboard.writeText(body()); setDone("ok"); }
    catch {
      // fallback for browsers without clipboard permission: select a temporary textarea
      const t = document.createElement("textarea"); t.value = body(); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      try { setDone(document.execCommand("copy") ? "ok" : "fail"); } catch { setDone("fail"); } finally { t.remove(); }
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={copy} className="btn btn-accent"><span aria-hidden>✉</span>{label}</button>
      <p className="min-h-[1.25rem] text-sm" aria-live="polite">
        {done === "ok" && <span className="text-ok">Copied. Paste it into an email and check it before sending.</span>}
        {done === "fail" && <span className="text-conf">Could not copy automatically. Open the message below and copy it by hand.</span>}
      </p>
      {preview && <details className="text-sm"><summary className="text-muted">See the message</summary>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface2 p-4 font-sans text-[0.8rem] leading-relaxed text-ink">{text.replace(/\{ATLAS_URL\}\S*/g, "(link to this page)")}</pre></details>}
    </div>
  );
}

export function PrintSummary({ label = "Print a one-page summary for your doctor" }: { label?: string }) {
  return <div><button type="button" onClick={() => window.print()} className="btn btn-ghost"><span aria-hidden>⎙</span>{label}</button></div>;
}
