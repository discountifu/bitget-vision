import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const LOG_DIR = join(process.cwd(), "logs");

export interface BitgetCallLog {
  ts: number; // epoch ms
  url: string;
  endpoint: string; // path incl. query params
  cacheHit: boolean; // true → does NOT count toward Bitget call volume
  status?: number; // HTTP status
  bitgetCode?: string; // Bitget response `code`
  latencyMs: number;
  callSeq?: number; // real outbound call sequence (absent on cache hit)
  cumulativeCalls: number; // cumulative real call count this process
  error?: string;
}

async function write(file: string, record: object) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(
      join(LOG_DIR, file),
      JSON.stringify({ ...record, iso: new Date().toISOString() }) + "\n",
    );
  } catch (err) {
    // Logging must never break the request path; surface to console only.
    console.warn("[logger] failed to write", file, err);
  }
}

export const logBitgetCall = (r: BitgetCallLog) => write("bitget-calls.jsonl", r);
export const appendLog = (r: Record<string, unknown>) => write("api-signals.jsonl", r);
