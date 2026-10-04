"use client";
import { setTheme, useTheme } from "@/lib/theme";

/** ☀️/🌙 switch. Shows the theme you would switch TO; the label says so for screen readers. */
export function ThemeToggle() {
  const t = useTheme();
  const next = t === "light" ? "dark" : "light";
  return (
    <button type="button" onClick={() => setTheme(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
      className="control grid h-9 w-9 place-items-center rounded-full bg-surface text-base transition-colors hover:border-accent">
      <span aria-hidden>{t === "light" ? "🌙" : "☀️"}</span>
    </button>
  );
}
