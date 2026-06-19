# Reproducible samples

Each file is the verbatim JSON response of the live signal API. Reproduce with
the dev server running (`pnpm dev`) and no API keys required:

| File | Request |
|---|---|
| `signals-long.json` | `GET /api/signals?direction=long&top=5&minVolume=5000000` |
| `signals-short.json` | `GET /api/signals?direction=short&top=5&minVolume=5000000` |
| `signals-long-custom-weights.json` | `GET /api/signals?direction=long&top=5&w_mom=0.5&w_trend=0.4&minVolume=10000000` |

```bash
curl "http://localhost:3000/api/signals?direction=long&top=5&minVolume=5000000"
```

Each result carries the full factor breakdown (`factors`) and the raw Bitget
`snapshot` behind the score, so the ranking is fully auditable. Live numbers
move with the market; the structure is stable.

The matching outbound-call evidence is in `../logs/bitget-calls.jsonl`.
