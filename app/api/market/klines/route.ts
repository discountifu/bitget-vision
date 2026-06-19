import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/bitget";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Single-symbol K-line proxy for the detail panel (avoids browser CORS to Bitget).
//   GET /api/market/klines?symbol=BTCUSDT&granularity=1H&limit=200
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const granularity = sp.get("granularity") ?? "1H";
  const limit = Math.max(10, Math.min(1000, Number(sp.get("limit") ?? 200)));

  try {
    const candles = await getCandles(symbol, granularity, limit);
    const rows = [...candles]
      .sort((a, b) => +a[0] - +b[0])
      .map((c) => ({
        ts: +c[0],
        open: +c[1],
        high: +c[2],
        low: +c[3],
        close: +c[4],
        volume: +c[5],
      }));
    return NextResponse.json({ symbol, granularity, candles: rows });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
