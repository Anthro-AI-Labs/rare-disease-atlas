import { FuncIcon } from "@/components/FuncIcon";
import { Tip } from "@/components/Tip";
import { FUNC, STATUS_MEANING } from "@/lib/plain";
import type { Kind } from "@/lib/status";

/** Tooltip bodies are plain data so client components (scenes, map) can render them too. */
export type GeneTipData = { sym: string; func: string };
export type DiseaseTipData = { common: string; name: string; gene: string; def: string | null; url: string | null; mondo: string | null };

export const GeneTipBody = ({ t }: { t: GeneTipData }) => (
  <span className="flex gap-2"><FuncIcon f={t.func} size={20} className="mt-0.5 text-accent" />
    <span><b>{t.sym}</b>: {FUNC[t.func].desc}.<span className="tip-sub">Type of role: {FUNC[t.func].label.toLowerCase()}, from the papers we read.</span></span></span>
);
export const DiseaseTipBody = ({ t }: { t: DiseaseTipData }) => (
  <span className="block"><b>{t.common}</b><span className="block text-muted">{t.name}</span>
    {t.def && <span className="mt-1.5 block">{t.def}</span>}
    {t.url && <span className="tip-sub">Source: <a href={t.url} target="_blank" rel="noreferrer">{t.mondo ?? "MONDO"} definition</a></span>}</span>
);

export const GeneName = ({ t, children, className = "" }: { t: GeneTipData; children?: React.ReactNode; className?: string }) =>
  <Tip content={<GeneTipBody t={t} />} className={children ? className : `dotted ${className}`}>{children ?? t.sym}</Tip>;
export const DiseaseName = ({ t, children, className = "" }: { t: DiseaseTipData; children?: React.ReactNode; className?: string }) =>
  <Tip content={<DiseaseTipBody t={t} />} className={children ? className : `dotted ${className}`}>{children ?? t.common}</Tip>;

/** Status meaning on hover/focus. The wrapped chip keeps its own tap action (opening evidence), so tap is not hijacked. */
export const StatusTip = ({ kind, children, interactive = true }: { kind: Kind; children: React.ReactNode; interactive?: boolean }) =>
  <Tip content={STATUS_MEANING[kind]} tap={!interactive} focusable={!interactive} className="!cursor-[inherit]">{children}</Tip>;
