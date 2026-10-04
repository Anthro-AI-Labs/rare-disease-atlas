"use client";
import { useInView } from "framer-motion";
import { useRef, useSyncExternalStore } from "react";
import { useStill } from "@/lib/motion";

const noop = () => () => {};
/** Scene D, "What you can do this week": the action card slides up and glows cyan (the page's L2 glow).
 *  Visible by default (server HTML, no JS, reduced motion); it is only hidden-then-revealed once mounted with motion allowed. */
export default function SceneD({ text, children }: { text: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const still = useStill();
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const phase = !mounted || still ? "" : seen ? "sd-play" : "sd-pre";
  return (
    <div ref={ref}>
      <section aria-label="What you can do this week" className={`card glow-2 tone-accent p-6 sm:p-8 ${phase}`}>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">This week</p>
        <p className="mt-2 text-2xl font-semibold leading-snug sm:text-3xl">{text}</p>
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
        <p className="mt-4 text-sm text-muted">A suggestion to discuss, not medical advice.</p>
      </section>
    </div>
  );
}
