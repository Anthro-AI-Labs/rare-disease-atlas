import Link from "next/link";
import { Chip } from "@/components/Chip";
import { RouteBar } from "@/components/RouteBar";
import { Ev } from "@/components/EvidenceDrawer";
import { StatusTip } from "@/components/Names";
import type { Sat } from "@/lib/story";

/** "Shares a study": one curated study or registry names both genes. Ranked above phenotype-similarity hypotheses. */
export function StudyCards({ sats, from }: { sats: Sat[]; from: string }) {
  if (!sats.length) return null;
  return (
    <section aria-label="Conditions that share a study with yours" className="mb-6">
      <h3 className="text-lg font-semibold">Shares a study with {from}</h3>
      <ul className="mt-3 grid gap-4">
        {sats.map((x) => {
          const sup = x.status === "supported";
          const first = x.studies[0];
          return (
            <li key={x.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={x.href} className="font-heading text-2xl font-semibold text-ink hover:text-accent">{x.gene}</Link>
                  <p className="text-sm text-muted">{x.common}</p>
                </div>
                <StatusTip kind={sup ? "ok" : "hyp"}><Ev ids={x.edgeIds} title={`Evidence: shared study with ${x.common}`}>
                  <span className={`chip chip-${sup ? "ok" : "hyp"} cursor-pointer`}>{sup ? "Supported: shared study" : "Pending verification"}<span aria-hidden className="ev-n">· evidence</span></span></Ev></StatusTip>
              </div>
              <p className="mt-3 break-words text-lg"><b className="font-semibold">Both are included in the same study:</b> {first.name}{first.id ? ` (${first.id})` : ""}.
                {x.studies.length > 1 && <span className="text-muted"> {x.studies.length - 1} more shared {x.studies.length === 2 ? "study" : "studies"}.</span>}</p>
              {!sup && <p className="mt-1 text-sm text-muted">The study rows in our curated list have not been verified yet by a person, so this link is shown as pending.</p>}
              {x.opposite && <p className="mt-1 text-sm text-muted">The usual gene change differs between the two conditions, so no related community is suggested.</p>}
              <RouteBar className="mt-3" overall={x.overall} segments={x.segments} />
              {x.studies.length > 1 && <ul className="mt-3 list-disc pl-5 text-sm text-muted">{x.studies.map((st) => <li key={st.edge_id} className="break-words">{st.name} ({st.id}) <Chip kind={st.status === "supported" ? "ok" : "hyp"}>{st.status === "supported" ? "Supported" : "Pending verification"}</Chip></li>)}</ul>}
            </li>);
        })}
      </ul>
    </section>
  );
}
