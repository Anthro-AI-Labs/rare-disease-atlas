import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Chip } from "@/components/Chip";
import type { Kind } from "@/lib/status";

export const metadata = { title: "The 10× case · Rare Disease Atlas" };

// The text lives in web/content/10x.md (written and source-checked by Varduhi). It is rendered verbatim: this page only adds links,
// the formula layout and a label per statement. Labels are plain pattern matches on the words already in the text.
function read() {
  try { return fs.readFileSync(path.join(process.cwd(), "content/10x.md"), "utf8"); } catch { return null; }
}

type Tag = "measured" | "sourced" | "estimate";
const TAG: Record<Tag, { kind: Kind; label: string; hint: string }> = {
  measured: { kind: "ok", label: "Measured", hint: "Timed by the team on real work" },
  sourced: { kind: "accent", label: "Sourced", hint: "Comes from a cited record or paper" },
  estimate: { kind: "hyp", label: "Team estimate / assumption", hint: "No source: a guess or an assumption we state openly" },
};
function tagsOf(text: string, section: string): Tag[] {
  const t: Tag[] = [];
  if (/^(The milestone|What must be validated next)$/i.test(section)) return t;   // plans, not findings: no label
  if (/\b(team estimate|estimate|assumption|assumptions|is not checked|may not hold)\b/i.test(text) || /^Assumptions$/i.test(section)) t.push("estimate");
  if (/\bour own measured|own measurement|measured number|Our 2-hour measurement|2 hours of focused work|well over 10x\b/i.test(text)) t.push("measured");
  if (/Source:|https?:\/\/|checked on ClinicalTrials\.gov/i.test(text)) t.push("sourced");
  return t;
}

function Linked({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s)]+/g)) {
    let url = m[0]; const trail = /[.,;:]+$/.exec(url)?.[0] ?? "";
    if (trail) url = url.slice(0, -trail.length);
    parts.push(text.slice(last, m.index), <a key={m.index} href={url} target="_blank" rel="noreferrer" className="break-all text-accent underline">{url}</a>);
    last = (m.index ?? 0) + url.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

const Tags = ({ tags }: { tags: Tag[] }) => tags.length ? (
  <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">{tags.map((k) => <span key={k} title={TAG[k].hint} className={`chip chip-${TAG[k].kind} !text-[0.68rem]`}>{TAG[k].label}</span>)}</span>) : null;

function Formula({ line }: { line: string }) {
  const m = /^Overall speed-up = \((.+?)\) \/ \((.+?)\)$/.exec(line);
  if (!m) return <p>{line}</p>;
  return (
    <div className="card my-3 px-5 py-4" role="group" aria-label={line}>
      <span className="sr-only">{line}</span>
      <div aria-hidden className="flex flex-wrap items-center gap-x-4 gap-y-2 font-heading text-lg sm:text-xl">
        <span className="text-sm font-semibold uppercase tracking-widest text-muted">Overall speed-up</span><span>=</span>
        <span className="inline-flex flex-col items-center"><span className="px-2 pb-1">{m[1]}</span><span className="h-0 w-full border-t-2 border-ink" /><span className="px-2 pt-1">{m[2]}</span></span>
      </div>
    </div>
  );
}

export default function TenX() {
  const md = read();
  if (md === null) return <main className="mx-auto max-w-3xl px-5 py-10"><p className="text-muted">The 10× case text (web/content/10x.md) is missing.</p></main>;
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let section = "", para: string[] = [], list: string[] = [];
  const flushPara = () => { if (para.length) { const t = para.join(" "); blocks.push(<p key={blocks.length} className="mt-3">{<Linked text={t} />}<Tags tags={tagsOf(t, section)} /></p>); para = []; } };
  const flushList = () => {
    if (!list.length) return;
    const items = list; list = [];
    blocks.push(<ul key={blocks.length} className="mt-3 list-disc space-y-2.5 pl-6">{items.map((t, i) => /^Overall speed-up = /.test(t)
      ? <li key={i} className="list-none -ml-6"><Formula line={t} /></li> : <li key={i}><Linked text={t} /><Tags tags={tagsOf(t, section)} /></li>)}</ul>);
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (l.startsWith("# ")) { flushPara(); flushList(); section = l.slice(2).trim(); blocks.push(<h2 key={blocks.length} className="mt-10 text-2xl font-semibold sm:text-3xl">{section}</h2>); }
    else if (l.startsWith("- ")) { flushPara(); list.push(l.slice(2)); }
    else if (!l.trim()) { flushPara(); flushList(); }
    else if (list.length) list[list.length - 1] += " " + l.trim();
    else para.push(l.trim());
  }
  flushPara(); flushList();
  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 pt-4">
      <Link href="/" className="text-sm text-muted hover:text-accent">← Search</Link>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">The 10× case</h1>
      <p className="mt-3 text-lg text-muted">How much faster does the Atlas make it for a patient community to find partners and launch a shared study? We separate what we measured, what we sourced and what we only estimate.</p>

      <section aria-label="Summary" className="card glow-1 tone-ok mt-6 p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">In short</p>
        <ul className="mt-3 space-y-3 text-lg sm:text-xl">
          <li><b>Finding and connecting:</b> well over 10× <span className="chip chip-ok ml-1 !text-[0.7rem]">measured</span></li>
          <li><b>Launching a shared study:</b> about 1.3× <span className="chip chip-hyp ml-1 !text-[0.7rem]">estimate</span></li>
          <li>The biggest win may be joining an existing study.</li>
        </ul>
      </section>

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Key to the labels">
        {(Object.keys(TAG) as Tag[]).map((k) => <li key={k} className="flex items-center gap-2"><span className={`chip chip-${TAG[k].kind} !text-[0.7rem]`}>{TAG[k].label}</span><span className="text-muted">{TAG[k].hint}</span></li>)}
      </ul>

      <article className="mt-2 text-lg leading-relaxed">{blocks}</article>
      <p className="mt-10 text-sm text-muted">Text written and source-checked by Varduhi. Labels are added by the page from the words in each statement; the statements themselves are unchanged.</p>
    </main>
  );
}
