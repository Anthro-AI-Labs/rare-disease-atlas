import Link from "next/link";
import ClusterGraph from "@/components/ClusterGraph";
import Search from "@/components/Search";
import { Chip } from "@/components/Chip";
import { Term } from "@/components/Term";
import { diseases, graphData, slugOf } from "@/lib/graph";

export default function Home() {
  const ds = diseases();
  const { nodes, links } = graphData();
  return (
    <main className="mx-auto max-w-5xl px-5 pb-16">
      <section className="pt-8 sm:pt-14">
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] sm:text-6xl">Find the rare diseases that share your biology.</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted">
          Rare diseases are many, small and scattered, so families rarely know who else is working on the same biology.{" "}
          The Atlas links diseases by what happens inside the body and what patients experience, then shows who studies them and what already exists.{" "}
          Every link has a badge you can read at a glance, and every badge opens the evidence behind it.
        </p>
        <div className="mt-8 max-w-2xl"><Search big /></div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/disease/OMIM_612164" className="btn btn-accent">Start with STXBP1 <span aria-hidden>→</span></Link>
          <Link href="/explore" className="btn btn-ghost">Explore the map</Link>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="badges">
        <h2 id="badges" className="text-sm font-semibold uppercase tracking-widest text-muted">How to read the badges</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([["ok", "Supported", "Observed in a database or in a paper whose quote really says it."], ["hyp", "Hypothesis", "Worked out by a program from similarity. An idea to test, not a finding."],
            ["conf", "Conflicting evidence", "Sources disagree. A specialist should look before anyone relies on it."], ["ctx", "Context only", "Mentioned, but the quote does not state the claim, so it is not counted."]] as const).map(([k, t, d]) => (
            <div key={k} className="card p-4"><Chip kind={k}>{t}</Chip><p className="mt-2 text-sm text-muted">{d}</p></div>))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="map">
        <h2 id="map" className="text-2xl font-semibold">The map</h2>
        <p className="mt-1 max-w-2xl text-muted">Twelve <Term k="encephalopathy">epilepsy-related conditions</Term> from eight genes. Closer means more alike on symptoms and the literature; dashed lines are <Term k="hypothesis">hypotheses</Term>.</p>
        <div className="card mt-4 p-4 sm:p-6"><ClusterGraph nodes={nodes} links={links} height={440} /></div>
      </section>

      <section className="mt-12" aria-labelledby="all">
        <h2 id="all" className="text-2xl font-semibold">All diseases</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ds.map((d) => (
            <li key={d.id}><Link href={`/disease/${slugOf(d.id)}`} className="card block h-full p-4">
              <span className="font-heading text-lg font-semibold">{d.gene}</span>
              {d.role === "counterexample" && <span className="ml-2 chip chip-ctx">benign form</span>}
              {d.role === "contrast" && <span className="ml-2 chip chip-ctx">has approved therapies</span>}
              <span className="mt-1 block text-sm text-muted">{d.name}</span></Link></li>))}
        </ul>
      </section>
    </main>
  );
}
