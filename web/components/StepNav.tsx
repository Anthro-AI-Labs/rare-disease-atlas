"use client";
import { useEffect, useState } from "react";

export default function StepNav({ steps }: { steps: { id: string; label: string }[] }) {
  const [active, setActive] = useState(steps[0].id);
  useEffect(() => {
    const obs = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id); },
      { rootMargin: "-20% 0px -65% 0px" });
    steps.forEach((s) => { const el = document.getElementById(s.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [steps]);
  return (
    <nav aria-label="Steps" className="sticky top-0 z-30 -mx-5 border-b border-line bg-base/90 px-5 py-3 backdrop-blur">
      <ol className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
        {steps.map((s, i) => (
          <li key={s.id} className="shrink-0">
            <a href={`#${s.id}`} aria-current={active === s.id ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active === s.id ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:border-accent hover:text-ink"}`}>
              <span className={`grid h-5 w-5 place-items-center rounded-full text-xs ${active === s.id ? "bg-accent text-base" : "bg-surface2"}`}>{i + 1}</span>{s.label}
            </a>
          </li>))}
      </ol>
    </nav>
  );
}
