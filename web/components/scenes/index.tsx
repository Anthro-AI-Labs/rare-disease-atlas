"use client";
import dynamic from "next/dynamic";

/** Scenes are lazy-loaded (separate client chunks, no SSR); the placeholder keeps their height so nothing jumps. */
const ph = (h: number) => function Placeholder() { return <div className="card animate-pulse" style={{ height: h + 60 }} aria-hidden />; };
export const SceneA = dynamic(() => import("@/components/scenes/SceneA"), { ssr: false, loading: ph(260) });
export const SceneB = dynamic(() => import("@/components/scenes/SceneB"), { ssr: false, loading: ph(340) });
export const SceneC = dynamic(() => import("@/components/scenes/SceneC"), { ssr: false, loading: ph(320) });
