# Bitget Vision

GitHub 仓库：https://github.com/discountifu/bitget-vision  
部署链接：https://bitget-vision.vercel.app  
Bitget 调用日志：https://github.com/discountifu/bitget-vision/blob/main/logs/bitget-calls.jsonl

## 思路

我做这个项目是因为 Agent 开发和用户交易流程里有一个具体痛点：交易信号通常散在行情列表、K 线、资金费率、持仓量和流动性数据里，Agent 需要自己处理 CORS、限速、缓存、因子归一化、权重组合和解释输出，交易者也只能在多个页面之间切换观察市场。Bitget Vision 的解法是把 Bitget USDT 永续公开行情接入到一个统一的交易 Infra：服务端先用 `tickers` 做全市场粗筛，计算动量、资金费率拥挤度、持仓量和成交额；再只对候选标的拉 K 线，补充 EMA、RSI、多周期动量和 OI 变化；最后输出 `longScore` / `shortScore`、因子拆解和 3D 强弱星图。同一套评分引擎同时服务交易者界面和 Agent 接口，交易者看到市场结构，Agent 通过一次 `GET /api/signals` 拿到可解释的做多/做空候选。

## 完成度

开发中主要问题有四个：Bitget 浏览器直连存在 CORS 限制，所以用 Next.js Route Handlers 做服务端代理；行情接口存在限速，所以所有 Bitget 请求只经过 `lib/bitget.ts`，并用 `lru-cache` 做 TTL 缓存；Bitget 没有直接提供历史 OI 序列，所以用服务端内存滚动快照计算 ΔOI；Vercel Serverless 的日志和内存状态会随冷启动丢失，所以当前日志适合 demo 和核验调用链，后续需要接入 Vercel KV / Upstash 做持久化。当前已完成：3D 强弱星图、做多/做空高亮、权重滑块、轴映射、hover 因子拆解、详情面板、`/api/market/snapshot`、`/api/market/klines`、`/api/signals`、Bitget 调用 JSONL 日志、业务信号日志、样例响应。尚未完成：独立 MCP Server、回测接口、持久化审计存储、账户级数据、自动下单。下一步计划补齐 MCP Server，把 `/api/signals` 封装成 Agent 工具，并加入可回放的历史评分快照。技术栈：Next.js 16、React 19、TypeScript、Three.js、React Three Fiber、drei、postprocessing、Zustand、Recharts、lru-cache、Vercel。Bitget 工具使用：Bitget 公开行情 API v2；Agent Hub / Playbook / MCP Server / Skill Hub / 美股数据 API 当前未接入。

## 对 AI Trading 的看法

Agentic Trading 的价值在于把「行情数据 -> 可解释评分 -> 风控约束 -> 审计日志 -> 执行动作」变成稳定链路。LLM 适合做任务编排、参数选择、解释生成和异常处理，核心交易判断应由确定性的行情工具、评分函数和日志系统支撑。Bitget 如果后续提供更完整的历史 OI、统一市场横截面接口、标准 MCP 工具和可回放沙盒，会显著降低 Agent 接入交易流程的成本。

## 运行

```bash
pnpm install
pnpm dev
```

本项目只使用公开行情数据，无需 API Key。评分结果是数据可视化和研究输出，不构成投资建议。
