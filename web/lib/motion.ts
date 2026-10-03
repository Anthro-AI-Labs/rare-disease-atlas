"use client";
import { useReducedMotion } from "framer-motion";

/** True when the user prefers reduced motion (static final frames, no pulses). `?motion=force` overrides it for demos and testing. */
export function useStill() {
  const reduced = useReducedMotion();
  return !!reduced && !(typeof document !== "undefined" && document.documentElement.classList.contains("force-motion"));
}
