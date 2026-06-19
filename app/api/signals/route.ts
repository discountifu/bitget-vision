import { NextRequest, NextResponse } from "next/server";
import { buildUniverse } from "@/lib/pipeline";
import { combine, DEFAULT_WEIGHTS, type Weights } from "@/lib/scoring";
import { appendLog } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Agent-callable signal endpoint. One fetch → structured top long/short candidates
// with the full factor breakdown behind each score.
//
//   GET /api/signals?direction=long&top=5&minVolume=5000000
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const direction = sp.get("direction") === "short" ? "short" : "long";
  const top = Math.max(1, Math.min(50, Number(sp.get("top") ?? 5)));
  const minVolume = Number(sp.get("minVolume") ?? 5_000_000);

  // Optional weight overrides (?w_mom=0.4 ...), else defaults.
  const weights: Weights = { ...DEFAULT_WEIGHTS };
  for (const k of Object.keys(weights) as (keyof Weights)[]) {
    const v = sp.get(`w_${k}`);
    if (v !== null && Number.isFinite(+v)) weights[k] = +v;
  }

  try {
    const u = await buildUniverse(minVolume);
    const scored = u.factored.map((fr) => combine(fr, weights));
    const results = scored
      .sort((a, b) =>
        direction === "long" ? b.longScore - a.longScore : b.shortScore - a.shortScore,
      )
      .slice(0, top)
      .map((s, i) => ({
        symbol: s.symbol,
        rank: i + 1,
        score: Number((direction === "long" ? s.longScore : s.shortScore).toFixed(2)),
        factors: s.factors,
        snapshot: s.snapshot,
      }));

    const payload = {
      generatedAt: u.generatedAt,
      universe: u.universeSize,
      direction,
      weights,
      results,
      disclaimer: "Data-visualization scores only. Not investment advice.",
    };

    appendLog({ ts: Date.now(), endpoint: "/api/signals", direction, top, minVolume });
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
