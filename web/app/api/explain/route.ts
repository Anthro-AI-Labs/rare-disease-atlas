import { NextResponse } from "next/server";
import { explain } from "@/lib/explain";
import { load } from "@/lib/graph";

// Live explanations are for NEW queries only: pre-generated explanations (all 12 diseases) are returned from graph.json without calling OpenAI.
// Best-effort per-instance rate limit (serverless instances do not share memory): 5 requests / minute / IP.
const hits = new Map<string, number[]>();
export const maxDuration = 60;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 5) return NextResponse.json({ error: "rate limited: 5 requests per minute" }, { status: 429 });
  let body: { disease?: string; edgeIds?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }); }
  hits.set(ip, [...recent, now]);
  const { g, edges } = load();
  if (body.disease && !body.edgeIds?.length) {
    const ex = g.explanations[body.disease];
    return ex ? NextResponse.json({ ...ex, cached: true }) : NextResponse.json({ error: "unknown disease" }, { status: 404 });
  }
  const ids = [...new Set(body.edgeIds ?? [])];
  if (!ids.length || ids.length > 40 || ids.some((i) => typeof i !== "string" || !edges.has(i))) return NextResponse.json({ error: "edgeIds must be 1-40 existing edge ids" }, { status: 400 });
  try {
    const out = await explain(ids, ids.join(", "));
    if (!out) return NextResponse.json({ error: "explanations are not configured on this deployment (OPENAI_API_KEY / OPENAI_MODEL missing)" }, { status: 503 });
    return NextResponse.json({ ...out, input_edge_ids: ids, cached: false });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 502 });
  }
}
