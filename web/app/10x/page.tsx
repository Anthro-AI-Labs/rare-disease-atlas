import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

// WP4.1 slot: the content comes from Varduhi. Drop a markdown file at web/content/10x.md (blank line = paragraph, "# " = heading, "- " = bullet).
function read() {
  try { return fs.readFileSync(path.join(process.cwd(), "content/10x.md"), "utf8"); } catch { return null; }
}

export default function TenX() {
  const md = read();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-sm leading-relaxed">
      <Link href="/" className="text-neutral-500 underline">← Search</Link>
      <h1 className="mt-3 text-2xl font-semibold">The 10× case</h1>
      {md === null ? (
        <div className="mt-4 rounded border border-dashed border-neutral-300 p-4 text-neutral-600">
          <p><b>Content pending.</b> This page is a reserved slot; nothing here is a claim yet. It will contain:</p>
          <ul className="mt-2 list-disc pl-5"><li>the milestone a patient group reaches faster with the Atlas;</li><li>today&apos;s route to that milestone versus the Atlas route;</li><li>the explicit assumptions behind the comparison.</li></ul>
          <p className="mt-2">To fill it, add <code>web/content/10x.md</code> (blank line = paragraph, <code>#</code> = heading, <code>-</code> = bullet) and redeploy.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">{md.split(/\n\s*\n/).map((blk, i) => {
          const t = blk.trim();
          if (t.startsWith("# ")) return <h2 key={i} className="pt-2 text-lg font-semibold">{t.slice(2)}</h2>;
          if (t.startsWith("- ")) return <ul key={i} className="list-disc pl-5">{t.split("\n").map((l, j) => <li key={j}>{l.replace(/^-\s*/, "")}</li>)}</ul>;
          return <p key={i}>{t}</p>;
        })}</div>
      )}
    </main>
  );
}
