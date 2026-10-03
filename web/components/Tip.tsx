"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Tooltip: hover (~150 ms) or keyboard focus on desktop, tap on touch screens; Escape closes. Max 280px, small arrow,
 *  rendered in a portal with fixed positioning so scroll containers never clip it. `tap={false}` for triggers that already act on tap
 *  (e.g. a chip that opens the evidence drawer): they still get the tooltip on hover and focus. */
export function Tip({ content, children, tap = true, focusable = true, className = "" }:
  { content: React.ReactNode; children: React.ReactNode; tap?: boolean; focusable?: boolean; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; ax: number; below: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const touch = useRef(false);

  const show = useCallback((delay = 0) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), delay); }, []);
  const hide = useCallback((delay = 0) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), delay); }, []);

  useLayoutEffect(() => {
    if (!open || !ref.current || !tipRef.current) return;
    const r = ref.current.getBoundingClientRect(), t = tipRef.current.getBoundingClientRect();
    const vw = window.innerWidth, m = 8, cx = r.left + r.width / 2;
    const x = Math.min(Math.max(cx - t.width / 2, m), vw - t.width - m);
    const below = r.top - t.height - 10 < m;
    setPos({ x, y: below ? r.bottom + 10 : r.top - t.height - 10, ax: Math.min(Math.max(cx - x, 14), t.width - 14), below });
  }, [open]);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const away = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node) && !tipRef.current?.contains(e.target as Node)) setOpen(false); };
    const off = () => setOpen(false);
    document.addEventListener("keydown", esc); document.addEventListener("pointerdown", away); window.addEventListener("scroll", off, { passive: true });
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("pointerdown", away); window.removeEventListener("scroll", off); };
  }, [open]);

  return (
    <span ref={ref} className={`tip-trigger ${className}`} tabIndex={focusable ? 0 : undefined} aria-describedby={open ? id : undefined}
      onPointerEnter={(e) => { touch.current = e.pointerType !== "mouse"; if (!touch.current) show(120); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") hide(120); }}
      onFocus={() => { if (!touch.current) show(0); }} onBlur={() => hide(0)}
      onClick={() => { if (touch.current && tap) setOpen((o) => !o); }}>
      {children}
      {open && typeof document !== "undefined" && createPortal(
        <div ref={tipRef} id={id} role="tooltip" className={`tip-box ${pos?.below ? "below" : ""}`}
          style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, visibility: pos ? "visible" : "hidden", ["--ax" as string]: `${pos?.ax ?? 0}px` }}
          onPointerEnter={() => window.clearTimeout(timer.current)} onPointerLeave={(e) => { if (e.pointerType === "mouse") hide(120); }}>
          {content}
        </div>, document.body)}
    </span>
  );
}
