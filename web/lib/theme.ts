"use client";
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme-boot";

export type Theme = "light" | "dark";
const subs = new Set<() => void>();
export const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch {}
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useTheme = () => useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
