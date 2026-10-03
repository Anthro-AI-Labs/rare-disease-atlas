"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useStill } from "@/lib/motion";

/** Scene D, "What you can do this week": the action card slides up and glows cyan (the page's L2 glow). */
export default function SceneD({ text, children }: { text: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const still = useStill();
  return (
    <div ref={ref}>
      <motion.section aria-label="What you can do this week" initial={{ opacity: 0, y: 36 }} animate={seen || still ? { opacity: 1, y: 0 } : undefined}
        transition={still ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }} className="card glow-2 tone-accent p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">This week</p>
        <p className="mt-2 text-2xl font-semibold leading-snug sm:text-3xl">{text}</p>
        {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
        <p className="mt-4 text-sm text-muted">A suggestion to discuss, not medical advice.</p>
      </motion.section>
    </div>
  );
}
