# 3D 多维交易对强弱可视化 & 信号引擎 — 技术方案（Coding Agent 执行文档）

> 本文件可直接作为 `SPEC.md` 放进仓库根目录，让 coding agent（Claude Code / Cursor 等）照此实现。
> 目标赛道：Bitget 黑客松 · 赛道二 · 交易 Infra。
> 数据截止：2026 年 6 月，所有 API 端点与依赖版本均已核对。

---

## 0. 一句话定位

一个**在线 3D 可视化工具**：把 Bitget 全市场 USDT 永续合约绘制成可旋转的三维"强弱星图"，按多维度（价格动量、持仓量、资金费率、多空比、技术指标）实时打分，自动高亮**最适合做多**与**最适合做空**的标的。同一套引擎同时对外暴露 **Agent 可调用的信号 API（+ 可选 MCP）** 和**透明可回测的评分系统**。

**为什么这样设计能同时命中赛道二的三个方向：**

| 赛道二描述 | 本项目对应交付 |
|---|---|
| 给交易者用的产品（监控面板、可视化工具） | 3D 强弱星图 dashboard |
| 给 Agent 用的工具或框架 | `/api/signals` JSON 接口 + 可选 MCP server |
| 策略测评与评估系统 | 透明加权评分 + 轻量回测模块 |

---

## 1. 技术栈（与仓库 `package.json` 同步，2026-06）

### 1.1 已安装（当前仓库脚手架，create-next-app + shadcn）

```jsonc
// dependencies —— 实际 pin 版本
{
  "next": "16.2.6",                      // App Router，前后端一体
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "@base-ui/react": "^1.5.0",            // shadcn 底座（无障碍原语）
  "shadcn": "^4.11.0",                   // 组件 CLI / 注册表
  "class-variance-authority": "^0.7.1",  // 组件变体
  "clsx": "^2.1.1",                      // className 合并
  "tailwind-merge": "^3.6.0",            // Tailwind 类去冲突
  "tw-animate-css": "^1.4.0",            // 动画工具类
  "next-themes": "^0.4.6",               // 暗色主题（星图天然深色背景）
  "lucide-react": "^1.20.0"              // 图标
}
```

```jsonc
// devDependencies —— 实际 pin 版本
{
  "typescript": "^5",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "eslint": "^9",
  "eslint-config-next": "16.2.6",
  "prettier": "^3.8.3",
  "prettier-plugin-tailwindcss": "^0.8.0",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19"
}
```

### 1.2 待安装（实现 3D / 评分 / 数据层时按需 `npm i`）

```jsonc
{
  "@react-three/fiber": "^9.6.1",        // 必须 v9 配 react@19（已满足）
  "@react-three/drei": "^9.116.0",       // OrbitControls / Html / Text / Billboard
  "@react-three/postprocessing": "^3.x", // Bloom 辉光（酷炫核心）
  "three": "^0.170.0",
  "zustand": "^5.x",                     // 全局状态（universe / 轴映射 / 权重）
  "recharts": "^2.x",                    // 详情面板 2D 火柴图
  "lru-cache": "^11.x",                  // 后端 TTL 缓存
  "technicalindicators": "^3.x"          // RSI/EMA/ATR/MACD，也可自己写
}
```

> ⚠️ 版本铁律：`@react-three/fiber@9` 必须配 `react@19`（当前已 pin `react@19.2.4`，满足）；配 React 18 会装不上。`drei` 用 9.116+。
> 注：控制面板（轴映射下拉、权重滑块、universe 筛选）用已安装的 **shadcn + Base UI** 组件搭建，不再额外引入 UI 库。

部署：**Vercel**（前后端同仓库一键部署，免费额度足够 demo，自动给在线链接）。

---

## 2. 系统架构

```
┌───────────────────────────────────────────────────────────┐
│                     浏览器 (React 19)                       │
│  ┌─────────────────┐   ┌──────────────────────────────┐    │
│  │  控制面板         │   │   3D 场景 (R3F + Bloom)       │    │
│  │ - 轴映射          │   │  - 强弱星图散点              │    │
│  │ - 权重滑块        │◄─►│  - 做多/做空高亮             │    │
│  │ - universe 筛选   │   │  - hover 详情 / 因子拆解      │    │
│  └─────────────────┘   └──────────────────────────────┘    │
│            │  fetch /api/...                                 │
└────────────┼──────────────────────────────────────────────┘
             ▼
┌───────────────────────────────────────────────────────────┐
│         Next.js Route Handlers（服务端，解决 CORS）          │
│  /api/market/snapshot   → 全市场快照（1 次 tickers 调用）   │
│  /api/market/klines     → 单标的 K 线（按需）               │
│  /api/signals           → Agent 可调用：返回 top long/short │
│  /api/backtest          → 轻量回测（可选）                  │
│        │  内存 TTL 缓存 (lru-cache)  + OI 快照滚动缓冲        │
└────────┼──────────────────────────────────────────────────┘
         ▼  fetch（服务端无 CORS 限制，公开数据无需 API Key）
┌───────────────────────────────────────────────────────────┐
│                    Bitget 公开行情 API (v2)                  │
└───────────────────────────────────────────────────────────┘
```

**关键点：为什么必须有后端**
- Bitget 行情接口浏览器直连会被 CORS 拦截 → 服务端代理。
- 多空比接口限速 1 req/s → 必须服务端缓存。
- OI 变化量需要按时间采样做差 → 服务端维护滚动快照。

---

## 3. 数据层：Bitget 公开行情接口（全部无需 API Key）

Base URL：`https://api.bitget.com`

> 🔴 **硬性要求（不可省略）：所有对 Bitget API 的请求必须保留完整调用日志。**
> 每一次**真实出网**的 Bitget 请求都要落盘一条结构化日志，至少包含：
> - `ts`：ISO 时间戳 + epoch 毫秒（精确到 ms）；
> - `endpoint` / `url`：完整路径与查询参数（symbol、granularity、period 等）；
> - `cacheHit`：是否命中缓存（命中则**不计入** Bitget 调用量，但仍要记录，便于核对缓存命中率）；
> - `status` / `bitgetCode`：HTTP 状态 + Bitget 返回 `code`；
> - `latencyMs`：往返耗时；
> - `callSeq` / `cumulativeCalls`：本进程内**真实出网调用量**的自增序号与累计计数。
>
> 日志统一写入 `logs/bitget-calls.*`（JSONL 优先，便于回放与统计）。**禁止任何绕过日志的直连**——所有 Bitget 访问只能经 `lib/bitget.ts` 的统一封装出口（见 9.1），这是"可核查使用记录"的根证据，也是限速自检的唯一口径。

### 3.1 全市场快照（主力接口，一次拿全部）

```
GET /api/v2/mix/market/tickers?productType=usdt-futures
限速：宽松（市场公开），缓存 15–30s
```
单次返回所有 USDT 永续，每个 symbol 含：

| 字段 | 含义 | 用途 |
|---|---|---|
| `symbol` | 如 BTCUSDT | 主键 |
| `lastPr` | 最新价 | — |
| `change24h` | 24h 涨跌幅 | **动量因子** |
| `quoteVolume` / `usdtVolume` | 成交额 | **流动性权重** |
| `fundingRate` | 当前资金费率 | **拥挤度因子（已含，无需另调）** |
| `holdingAmount` | 持仓量(OI, 以币计) | **OI 水平 / 做差算 ΔOI** |
| `high24h` / `low24h` | 24h 高低 | 波动率近似 |
| `markPrice` / `indexPrice` | 标记/指数价 | — |

> 一次调用即可覆盖"动量 + 资金费率 + OI 水平 + 流动性"四大因子，是 Stage 1 评分的全部数据来源。

### 3.2 单标的 K 线（按需，仅 shortlist）

```
GET /api/v2/mix/market/candles?symbol=BTCUSDT&granularity=1H&limit=200&productType=usdt-futures
限速：约 20 req/s；返回 [ts, open, high, low, close, baseVol, quoteVol]
```
用于 Stage 2：计算 RSI / EMA / ATR / 多周期动量，以及详情面板火柴图。
历史更长用 `/api/v2/mix/market/history-candles`（90 天内）。

### 3.3 多空比（可选增强，重限速）

```
GET /api/v2/mix/market/account-long-short?symbol=BTCUSDT&period=1h&productType=usdt-futures
限速：1 req/1s ← 不能对全市场轮询
```
**策略**：仅对最终高亮的 top-N（做多前 5 + 做空前 5，共 ~10 个）拉取，结果缓存 ≥5 分钟。冷启动可先不显示多空比，拿到后再增量更新。

### 3.4 资金费率

当前值已在 3.1 的 `fundingRate` 中，无需单独调用。需要历史趋势再用 `/api/v2/mix/market/history-fund-rate`。

### 3.5 缓存与采样策略（写进后端）

- `tickers`：TTL 20s。
- `candles`：TTL 60s，按 symbol+granularity key。
- 多空比：TTL 300s。
- **ΔOI（持仓量变化）**：Bitget 无公开历史 OI 接口，方案——服务端用 lru-cache 维护每个 symbol 的最近 N 个 OI 快照（每次 snapshot 刷新时写入），ΔOI = 当前 - 最早样本。冷启动只有 1 个样本时 ΔOI=0，待第二次刷新后生效。
- **调用日志（强制）**：缓存命中与真实出网都各记一条日志（见 3 节硬性要求）；只有 `cacheHit=false` 的记录计入 Bitget 调用量。借此可随时统计「每分钟真实调用数」自查是否逼近限速（多空比 1 req/s、candles ~20 req/s），并在提交材料中证明调用合规。

---

## 4. 评分引擎（项目的"大脑"，必须透明可解释）

### 4.1 两段式评分（关键的限速友好设计）

- **Stage 1（全市场，1 次 tickers 调用）**：用 `change24h`、`fundingRate`、`holdingAmount`、`quoteVolume` 算粗分，对全市场排序。
- **Stage 2（仅 shortlist ~30 个）**：对粗分排名靠前/靠后的标的拉 K 线，补充 RSI、EMA 趋势、ATR、多周期动量、ΔOI，refine 得分。**只有这批进入高亮候选**。

### 4.2 因子定义（每个因子方向统一为：正 = 偏多）

所有因子先做**横截面稳健标准化**（用中位数/MAD 抗异常值），再 `tanh` 压到 [-1, 1]：

| 因子 | 计算 | 方向 |
|---|---|---|
| `F_mom` 动量 | `change24h`（Stage2 叠加多周期：近 1/4/24 根收益） | + 偏多 |
| `F_trend` 趋势 | `(close - EMA50)/EMA50`，或 EMA20 > EMA50 对齐度 | + 偏多 |
| `F_rsi` RSI 确认 | `(RSI-50)/50`，对超买/超卖做软衰减 | + 偏多 |
| `F_oi` 持仓确认 | `sign(priceChange) * z(ΔOI)`（价涨且 OI 增 = 真突破） | + 偏多 |
| `C_fund` 资金费率拥挤 | `fundingRate` 横截面 z 值 | 见下（反向惩罚） |
| `C_ls` 多空比拥挤 | 多空比偏离 z 值 | 见下（反向惩罚） |
| `W_liq` 流动性 | `z(quoteVolume)` | 非方向，作权重/门槛 |

### 4.3 合成公式

```
bias        = w_mom·F_mom + w_trend·F_trend + w_rsi·F_rsi + w_oi·F_oi

crowd_long  = w_fund·max(0,  fund_z) + w_ls·max(0,  ls_z)   // 多头过度拥挤 → 削弱做多
crowd_short = w_fund·max(0, -fund_z) + w_ls·max(0, -ls_z)   // 空头过度拥挤 → 削弱做空

liqGate     = clamp(W_liq 归一化到 0.3–1.0)                 // 低流动性整体降权/剔除

LongScore   = clamp01( (bias       - crowd_long ) ) · liqGate · 100
ShortScore  = clamp01( ((-bias)    - crowd_short) ) · liqGate · 100
```

- **最适合做多** = `LongScore` 最高的；**最适合做空** = `ShortScore` 最高的。
- 资金费率/多空比作为**反向拥挤惩罚**：极端正费率（多头拥挤）会降低做多分、间接抬高做空分，这是把"拥挤交易反指"内建进模型。
- 低于成交额门槛（如 `quoteVolume` < 设定值）直接剔除，避免推荐无法成交的垃圾币。

### 4.4 默认权重（全部做成 UI 滑块，实时重算）

| 权重 | 默认值 | 说明 |
|---|---|---|
| `w_mom` | 0.30 | 动量主导 |
| `w_trend` | 0.25 | 趋势确认 |
| `w_oi` | 0.20 | 持仓确认 |
| `w_rsi` | 0.10 | RSI 辅助 |
| `w_fund` | 0.10 | 资金费率拥挤惩罚 |
| `w_ls` | 0.05 | 多空比拥挤惩罚 |

> 默认值给"动量+确认"为主、"拥挤反指"为辅的风格。**重点不是权重多精确，而是完全可调 + 每个因子贡献在 hover 时拆解展示** —— 这正是"策略评估系统"的可信来源。

### 4.5 可解释性（加分项）

每个节点 hover 显示因子贡献条（stacked bar）：`F_mom +0.4 / F_trend +0.2 / C_fund -0.15 ...`，让评委一眼看懂"为什么这个币被判为最佳做多"。

---

## 5. 3D 可视化设计（R3F）

### 5.1 主视图：强弱星图（散点）

- 每个交易对 = 空间中一个**发光球体节点**。
- **三轴可重映射**（下拉选择任意指标），默认：
  - X = 动量（`change24h`）
  - Y = ΔOI / 成交额
  - Z = 资金费率
- **视觉编码**：
  - 球体大小 → 流动性（成交额）
  - 颜色 → 净评分（红空 ←→ 灰中性 ←→ 绿多 的渐变）
  - **Top 做多**：亮绿光晕 + 缓慢脉冲 + 文字标签 + 落地光柱
  - **Top 做空**：亮红/品红光晕 + 同上
- **Bloom 后处理**（`@react-three/postprocessing`）让高亮节点辉光外溢——这是"酷炫"的核心，强度对应评分。

### 5.2 交互

- `OrbitControls`（drei）旋转/缩放/平移。
- hover：`Html`/`Billboard` 标签 + 因子拆解条 + mini 火柴图。
- 点击：右侧详情面板拉 Stage 2 K 线 + 指标 + 历史资金费率。
- 顶部控制条：universe 筛选（Top N 成交额 / 自选列表）、轴映射、权重滑块、自动刷新开关。

### 5.3 性能

- 节点用 `InstancedMesh`（drei `<Instances>`）批量渲染，几百个点无压力。
- 自动刷新（轮询 `/api/market/snapshot`，默认 20s）用插值动画过渡节点位置（看起来"会动"）。
- 标签只对高亮 + hover 节点渲染，避免文字过载。

### 5.4 次要视图（可选/Stretch）

- 选中单标的 → 3D K 线带（candlestick ribbon），价格×时间×成交量三维展开。
- 实时模式：接 Bitget WebSocket 推送 ticker（`wss://ws.bitget.com/v2/ws/public`）替代轮询。

---

## 6. Agent 接口（给赛道二"Agent 工具"维度）

### 6.1 信号 API（必做，简单且高价值）

```
GET /api/signals?direction=long&top=5&minVolume=5000000
→ 200 JSON
{
  "generatedAt": "2026-06-19T08:00:00Z",
  "universe": 312,
  "direction": "long",
  "weights": { ... },
  "results": [
    {
      "symbol": "XXXUSDT",
      "score": 87.4,
      "rank": 1,
      "factors": { "mom": 0.42, "trend": 0.21, "oi": 0.18, "rsi": 0.06, "fundCrowd": -0.12, "lsCrowd": -0.03 },
      "snapshot": { "lastPr": "...", "change24h": "...", "fundingRate": "...", "oi": "...", "volume": "..." }
    }
  ]
}
```
让其他开发者/Agent 一行 `fetch` 就能拿到结构化做多/做空候选 —— 这就是"其他开发者已接入"的接入点。

### 6.2 MCP Server（可选，进一步加分）

用 `@modelcontextprotocol/sdk` 包一个 server，暴露 `get_trade_signals` 工具，内部转调 `/api/signals`。README 给出 `claude_desktop_config.json` 接入示例。这样任意 MCP Agent 可直接调用你的信号引擎。

---

## 7. 评估/回测模块（给"策略测评"维度，Stretch）

`/api/backtest`：给定时间窗与权重，对历史某时点的 top-long/top-short 选币，用之后 N 小时的实际收益验证命中率与平均收益，输出：
- 做多组 vs 做空组 vs 全市场基准的收益对比；
- 命中率、夏普近似、最大回撤；
- 不同权重组合的对比（证明评分有效，不是随机）。

回测数据用 `history-candles`。即使简化版（单时点、固定持有期）也能显著增强"可核查"与"评估系统"说服力。

---

## 8. 项目结构

```
/
├─ app/
│  ├─ page.tsx                 # 主页面：控制面板 + 3D Canvas
│  ├─ layout.tsx
│  └─ api/
│     ├─ market/
│     │  ├─ snapshot/route.ts  # 全市场快照 + Stage1 评分
│     │  └─ klines/route.ts    # 单标的 K 线代理
│     ├─ signals/route.ts      # Agent 信号接口
│     └─ backtest/route.ts     # 可选回测
├─ lib/
│  ├─ bitget.ts                # Bitget 客户端 + 缓存 + 唯一出网出口（强制记日志）
│  ├─ logger.ts                # 调用日志器：logBitgetCall / appendLog → logs/*.jsonl
│  ├─ scoring.ts               # 因子标准化 + 评分（前后端共用）
│  ├─ indicators.ts            # RSI/EMA/ATR/MACD
│  └─ oiBuffer.ts              # OI 滚动快照（算 ΔOI）
├─ components/
│  ├─ Scene.tsx                # R3F Canvas + Bloom
│  ├─ NodeField.tsx            # InstancedMesh 节点场
│  ├─ Highlights.tsx           # 多空高亮光晕/光柱/标签
│  ├─ ControlPanel.tsx         # 轴映射 + 权重滑块 + universe
│  └─ DetailPanel.tsx          # 选中详情 + 火柴图 + 因子拆解
├─ store/useStore.ts           # zustand
├─ samples/                    # 评委可复现：输入+输出样本
├─ logs/                       # 调用日志（JSONL，含时间戳与真实调用量）
│  ├─ bitget-calls.jsonl       # 每次 Bitget 出网/命中缓存的完整记录（强制）
│  └─ api-signals.jsonl        # /api/signals 等业务接口调用记录
└─ SPEC.md
```

---

## 9. 关键代码骨架（难点已就位，coding agent 补全其余）

### 9.1 Bitget 客户端 + 缓存 + 强制调用日志（`lib/bitget.ts`）

**唯一出网出口**：所有 Bitget 请求都必须经过这里的 `get()`，每次调用（命中缓存或真实出网）都落一条日志，真实出网递增全局计数。严禁在其他文件直接 `fetch` Bitget。

```ts
import { LRUCache } from "lru-cache";
import { logBitgetCall } from "@/lib/logger";

const BASE = "https://api.bitget.com";
const cache = new LRUCache<string, any>({ max: 500, ttl: 20_000 });

let cumulativeCalls = 0; // 本进程真实出网调用量

async function get(path: string, ttl = 20_000) {
  const url = `${BASE}${path}`;
  const startedAt = Date.now();

  // 命中缓存：不计入 Bitget 调用量，但仍记录（核对缓存命中率）
  const hit = cache.get(path);
  if (hit !== undefined) {
    logBitgetCall({ ts: startedAt, url, endpoint: path, cacheHit: true,
      latencyMs: 0, cumulativeCalls });
    return hit;
  }

  // 真实出网：计入调用量
  const callSeq = ++cumulativeCalls;
  try {
    const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
    const json = await res.json();
    logBitgetCall({ ts: startedAt, url, endpoint: path, cacheHit: false,
      status: res.status, bitgetCode: json.code, latencyMs: Date.now() - startedAt,
      callSeq, cumulativeCalls });
    if (json.code !== "00000") throw new Error(`Bitget ${json.code}: ${json.msg}`);
    cache.set(path, json.data, { ttl });
    return json.data;
  } catch (err) {
    logBitgetCall({ ts: startedAt, url, endpoint: path, cacheHit: false,
      status: -1, error: String(err), latencyMs: Date.now() - startedAt,
      callSeq, cumulativeCalls });
    throw err;
  }
}

export const getTickers = () =>
  get(`/api/v2/mix/market/tickers?productType=usdt-futures`, 20_000);

export const getCandles = (symbol: string, granularity = "1H", limit = 200) =>
  get(`/api/v2/mix/market/candles?symbol=${symbol}&granularity=${granularity}&limit=${limit}&productType=usdt-futures`, 60_000);

export const getLongShort = (symbol: string, period = "1h") =>
  get(`/api/v2/mix/market/account-long-short?symbol=${symbol}&period=${period}&productType=usdt-futures`, 300_000);
```

### 9.1.1 调用日志器（`lib/logger.ts`）

JSONL 追加写入 `logs/`，每条一行，便于回放与统计「真实调用量 / 命中率 / 限速逼近度」。`appendLog`（业务接口调用记录，见 9.3）与 `logBitgetCall`（Bitget 出网记录）共用同一落盘逻辑。

```ts
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const LOG_DIR = join(process.cwd(), "logs");

export interface BitgetCallLog {
  ts: number;                 // epoch ms
  url: string;
  endpoint: string;           // 含查询参数的路径
  cacheHit: boolean;          // true → 不计入 Bitget 调用量
  status?: number;            // HTTP 状态
  bitgetCode?: string;        // Bitget 返回 code
  latencyMs: number;
  callSeq?: number;           // 真实出网自增序号（cacheHit 时缺省）
  cumulativeCalls: number;    // 累计真实调用量
  error?: string;
}

async function write(file: string, record: object) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(join(LOG_DIR, file),
      JSON.stringify({ ...record, iso: new Date().toISOString() }) + "\n");
  } catch { /* 日志失败不阻断主流程，但应在控制台告警 */ }
}

export const logBitgetCall = (r: BitgetCallLog) => write("bitget-calls.jsonl", r);
export const appendLog = (r: Record<string, unknown>) => write("api-signals.jsonl", r);
```

> ⚠️ Vercel serverless 文件系统是临时/只读盘外的，`logs/` 写入仅在本地与长驻进程有效；线上若需持久审计，按 12 节切到 Vercel KV / Upstash，并把同一条 `BitgetCallLog` 改写到 KV。本地 demo 与提交材料里的 `logs/` 用 JSONL 即可。

### 9.2 评分核心（`lib/scoring.ts`，签名先固定）

```ts
export interface Weights { mom:number; trend:number; oi:number; rsi:number; fund:number; ls:number; }
export interface Factors { mom:number; trend:number; oi:number; rsi:number; fundCrowd:number; lsCrowd:number; }
export interface Scored {
  symbol:string; longScore:number; shortScore:number;
  factors:Factors; snapshot:Record<string,string>;
}

// 稳健横截面标准化：median/MAD → tanh 到 [-1,1]
export function robustZ(values:number[]):number[] { /* median, MAD, tanh */ return []; }

export function score(rows: RawRow[], w: Weights, minVolume: number): Scored[] {
  // 1. 计算各列 robustZ
  // 2. bias = w.mom*F_mom + w.trend*F_trend + w.rsi*F_rsi + w.oi*F_oi
  // 3. crowd_long/short 由 fund_z, ls_z 的正负半轴构成
  // 4. liqGate = clamp(volZ → 0.3..1)，volume<minVolume 剔除
  // 5. longScore/shortScore = clamp01(...) * liqGate * 100
  return [];
}
```

### 9.3 信号 API（`app/api/signals/route.ts`）

```ts
import { NextRequest, NextResponse } from "next/server";
import { getTickers } from "@/lib/bitget";
import { score, DEFAULT_WEIGHTS } from "@/lib/scoring";
import { appendLog } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const direction = sp.get("direction") ?? "long";
  const top = Number(sp.get("top") ?? 5);
  const minVolume = Number(sp.get("minVolume") ?? 5_000_000);

  const rows = await getTickers();
  const scored = score(rows, DEFAULT_WEIGHTS, minVolume)
    .sort((a, b) => direction === "long"
      ? b.longScore - a.longScore
      : b.shortScore - a.shortScore)
    .slice(0, top);

  const payload = { generatedAt: new Date().toISOString(), universe: rows.length, direction, weights: DEFAULT_WEIGHTS, results: scored };
  appendLog({ ts: Date.now(), endpoint: "/api/signals", direction, top }); // 可核查记录
  return NextResponse.json(payload);
}
```

### 9.4 R3F 场景 + Bloom（`components/Scene.tsx`）

```tsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import NodeField from "./NodeField";
import Highlights from "./Highlights";

export default function Scene({ nodes }: { nodes: NodeVM[] }) {
  return (
    <Canvas camera={{ position: [6, 5, 8], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={["#070a12"]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} />
      <gridHelper args={[20, 20, "#1b2436", "#101622"]} />
      <NodeField nodes={nodes} />
      <Highlights nodes={nodes.filter(n => n.highlight)} />
      <OrbitControls enableDamping />
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.6} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
```

---

## 10. 开发阶段（建议按此排期，保证可提交）

| 阶段 | 内容 | 是否必须 |
|---|---|---|
| **P1 MVP** | 后端 snapshot+Stage1 评分 → 前端 3D 散点 + 多空高亮 + 控制面板 | ✅ 提交底线 |
| **P2 接入** | `/api/signals` 接口 + `samples/` + `logs/` + README | ✅ 满足"可核查""接入方式" |
| **P3 深化** | Stage2 K 线指标 + 因子拆解 hover + 详情面板 | 强烈建议 |
| **P4 加分** | MCP server / 回测模块 / WebSocket 实时 | Stretch |

先把 P1+P2 跑通拿到完整可提交版本，再往上叠。

---

## 11. 满足赛事提交材料的对应清单

| 赛事要求 | 本项目落地方式 |
|---|---|
| GitHub public + README（安装/接入/示例，他人可独立跑通） | README 写：`npm i` → 配 0 个密钥（公开数据）→ `npm run dev`；附 `curl /api/signals` 接入示例 |
| 部署链接（选填） | Vercel 一键部署，附线上地址 |
| **可核查使用记录（必填）** | ① `logs/bitget-calls.jsonl` 提交**每一次 Bitget 请求**的完整日志（时间戳 + 完整 URL + 缓存命中 + 累计真实调用量），证明数据真实来自 Bitget 且调用合规；② `logs/api-signals.jsonl` 提交 `/api/signals` 业务调用日志；③ `samples/` 提交输入参数 + 输出 JSON，评委可复现；④ README 写明 MCP/接口接入方式 |
| 演示视频（Demo 需登录则必填） | 本项目**无需登录** → 视频选填；仍建议录 ≤3min：从 `npm run dev` 到旋转星图、高亮多空、调权重重排、调一次 `/api/signals` |

> 因为全程用**公开行情数据、无登录**，演示视频从必填降为选填，且"他人独立跑通"门槛极低（无需任何 API Key）—— 这是评分上的隐形优势。

---

## 12. 风险与边界（提前规避）

1. **CORS**：前端绝不直连 Bitget，一律走 `/api/*`。
2. **多空比限速 1 req/s**：只对最终高亮 ~10 个拉取并缓存 5min，其余因子不依赖它。
3. **ΔOI 无历史接口**：靠服务端滚动快照做差，冷启动首刷 ΔOI=0，文档需说明。
4. **Stage2 不要全市场跑指标**：只对 shortlist（~30）拉 K 线，否则慢且触限速。
5. **新合约/数据缺失**：标准化前过滤掉 `quoteVolume`/价格为 0 或 null 的行。
6. **Vercel 函数无状态**：内存缓存与 OI 缓冲在 serverless 冷启动会丢；demo 可接受，若要稳定可换 Vercel KV / Upstash Redis（README 留开关）。
7. **不构成投资建议**：UI 与 README 加免责声明，评分仅为数据可视化。

---

## 13. 给 Coding Agent 的执行提示

1. 脚手架已就位（Next 16 + React 19 + Tailwind 4 + shadcn，见 1.1）。按第 8 节补建目录；按 1.2 用 `npm i` 装 3D / 评分 / 数据层依赖。
2. 按 9.1 → 9.2 → 9.3 顺序打通**数据→评分→接口**，用 `curl` 验证 `/api/signals` 返回合理 JSON（先不碰 3D）。
3. 再做 3D（9.4 + NodeField + Highlights），把接口数据喂进去。
4. 控制面板权重滑块改 zustand，触发前端重算评分（评分函数前后端共用 `lib/scoring.ts`）。
5. 最后补 `samples/`、`logs/`、README、（可选）MCP 与回测。
6. 每个 API 路由都要 try/catch 并处理 Bitget `code !== "00000"` 的情况。
7. **强制：所有 Bitget 访问只走 `lib/bitget.ts` 的 `get()`，每次调用必落 `logs/bitget-calls.jsonl`（时间戳 + URL + 缓存命中 + 真实调用量计数）。** 任何绕过该出口的直连都视为不合规，需在 review 时拒绝。
