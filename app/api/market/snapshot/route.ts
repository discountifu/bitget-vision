import { NextRequest, NextResponse } from "next/server";
import { buildUniverse } from "@/lib/pipeline";
import { DEFAULT_WEIGHTS } from "@/lib/scoring";
import { bitgetCumulativeCalls } from "@/lib/bitget";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Full-market snapshot: factored rows for every symbol so the client can
// re-score live as weight sliders move. Stage-1 covers all; Stage-2 (K-line
// indicators) covers the shortlist.
export async function GET(req: NextRequest) {
  const minVolume = Number(req.nextUrl.searchParams.get("minVolume") ?? 0);
  try {
    const u = await buildUniverse(minVolume);
    return NextResponse.json({
      generatedAt: u.generatedAt,
      universe: u.universeSize,
      totalSymbols: u.totalSymbols,
      stage2Count: u.stage2Count,
      defaultWeights: DEFAULT_WEIGHTS,
      bitgetCalls: bitgetCumulativeCalls(),
      nodes: u.factored,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
