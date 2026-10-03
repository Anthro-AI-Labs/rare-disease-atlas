import Link from "next/link";
import ClusterGraph from "@/components/ClusterGraph";
import { Chip } from "@/components/Chip";
import { Term } from "@/components/Term";
import { graphData, load, slugOf } from "@/lib/graph";
import { ROUTE } from "@/lib/status";

export const metadata = { title: "Explore the map · Rare Disease Atlas" };

export default function Explore() {
  const { g } = load();
  const { nodes, links } = graphData();
  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-6">
      <h1 className="text-4xl font-bold sm:text-5xl">Explore the map</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Each circle is a disease, labelled by its gene. Closer together means more alike on symptoms and the literature. Select a disease to open it.</p>
      <div className="card mt-6 p-4 sm:p-6"><ClusterGraph nodes={nodes} links={links} height={560} /></div>
      <p className="mt-3 text-sm text-muted">Groupings come from a <Term k="computed">computed</Term> similarity (symptoms plus, where the literature allows, the type of gene change). They are <Term k="hypothesis">hypotheses</Term>, and groupings marked uncertain are not settled. Same-gene pairs of a severe and a benign form are shown with a dashed circle.</p>
      <h2 className="mt-10 text-2xl font-semibold">Groups</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {g.clusters.map((c) => (
          <div key={c.cluster} className="card p-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted">Group {c.cluster + 1}</p>
            <ul className="mt-3 space-y-3">{c.members.map((m) => (
              <li key={m.id}><Link href={`/disease/${slugOf(m.id)}`} className="font-heading text-lg font-semibold">{m.gene}</Link>
                {m.role === "counterexample" && <span className="ml-2 chip chip-ctx">benign form</span>}
                <span className="mt-0.5 block text-sm text-muted">{m.name}</span>
                <span className="mt-1 flex flex-wrap gap-2"><Chip kind={ROUTE[g.meta.gaps[m.id].route_status].kind}>{ROUTE[g.meta.gaps[m.id].route_status].label}</Chip>{m.uncertain && <Chip kind="conf" title={m.uncertain_reason}>Grouping uncertain</Chip>}</span></li>))}</ul>
          </div>))}
      </div>
    </main>
  );
}
