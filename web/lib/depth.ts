"use client";
import { useSyncExternalStore } from "react";
import { DEPTH_KEY as KEY } from "@/lib/depth-boot";

/** Reading depth: "simple" = Level 1 story (families), "detailed" = Level 2 map + evidence counts (researchers).
 *  Stored on <html data-depth> (set before paint by an inline script in the layout) so server-rendered pages can hide/show with CSS. */
export type Depth = "simple" | "detailed";
const subs = new Set<() => void>();

export function getDepth(): Depth {
  return document.documentElement.dataset.depth === "detailed" ? "detailed" : "simple";
}
export function setDepth(d: Depth) {
  document.documentElement.dataset.depth = d;
  try { localStorage.setItem(KEY, d); } catch {}
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useDepth = () => useSyncExternalStore(subscribe, getDepth, () => "simple" as Depth);
