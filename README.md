# Sentinel — Personal Crypto Research Agent

> A personal crypto research analyst powered by [ElizaOS](https://elizaos.ai) and [Nosana](https://nosana.com) decentralized GPU compute.

Built for the **Nosana x ElizaOS Builders Challenge** (April 2026).

---

## What is Sentinel?

Sentinel is an autonomous AI agent that monitors, analyzes, and synthesizes crypto/DeFi intelligence from multiple on-chain and off-chain data sources. Ask a question, get a data-backed briefing — powered entirely by decentralized infrastructure.

**No paid API keys. No centralized cloud. Just open data + decentralized compute.**

---

## Features

| Command | Description | Data Sources |
|---------|-------------|-------------|
| **Market Briefing** | Full market overview with prices, volume, DeFi TVL, top movers | CoinGecko + DeFiLlama |
| **Token Analysis** | Deep-dive on any of 40+ tokens with price, DeFi metrics, risk factors | CoinGecko + DeFiLlama |
| **News Digest** | Aggregated headlines from top crypto news outlets | CoinDesk, CoinTelegraph, The Block |
| **Research Topic** | Open-ended research using ALL data sources | All 4 providers |
| **Nosana Ecosystem** | NOS token analysis, network stats, and ecosystem overview | CoinGecko + Nosana Network |

### Example Queries

```
"Give me a market briefing"
"Analyze SOL for me"
"What's the latest crypto news?"
"Research the state of Solana DeFi"
"Tell me about Ethereum's DeFi ecosystem"
"What's the NOS price?"
"How does Nosana GPU compute work?"
```

---

## Architecture

```
User Query (Chat Interface)
        |
        v
┌─────────────────────────┐
│   ElizaOS Agent Runtime  │
│   (Sentinel Character)   │
│                          │
│  ┌─────────────────────┐ │
│  │     Actions          │ │
│  │  - Market Briefing   │ │
│  │  - Token Analysis    │ │
│  │  - News Digest       │ │
│  │  - Research Topic    │ │
│  │  - Nosana Ecosystem  │ │
│  └────────┬─────────────┘ │
│           │               │
│  ┌────────v─────────────┐ │
│  │     Providers         │ │
│  │  - CoinGecko API     │ │
│  │  - DeFiLlama API     │ │
│  │  - RSS News Feeds    │ │
│  │  - Solana RPC        │ │
│  └────────┬─────────────┘ │
│           │               │
│  ┌────────v─────────────┐ │
│  │     Evaluators        │ │
│  │  - Freshness Check   │ │
│  │  - Source Quality     │ │
│  └──────────────────────┘ │
└──────────┬───────────────┘
           │
           v
┌──────────────────────────┐
│  Nosana GPU Network       │
│  Qwen3.5-27B-AWQ-4bit    │
│  (60k token context)      │
└──────────────────────────┘
```

---

## Tech Stack

- **Framework:** [ElizaOS v2](https://docs.elizaos.ai) — TypeScript AI agent framework
- **LLM:** Qwen3.5-27B-AWQ-4bit via Nosana hosted endpoint (60k token context)
- **Embeddings:** Qwen3-Embedding-0.6B via Nosana
- **Compute:** [Nosana](https://nosana.com) — Decentralized GPU network on Solana
- **Data Sources:** CoinGecko (free), DeFiLlama (free), RSS feeds (free), Solana public RPC
- **Frontend:** Custom research terminal with Socket.IO streaming
- **Testing:** Vitest — 60+ test cases

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) or [Node.js](https://nodejs.org) 23+
- Docker (for deployment)

### 1. Clone & Install

```bash
git clone https://github.com/himanshu748/sentinel-nosana-agent.git
cd sentinel-nosana-agent
cp .env.example .env
bun install
```

### 2. Configure Environment

The `.env.example` includes Nosana's hosted endpoints for the Builders Challenge:

```env
OPENAI_API_KEY=nosana
OPENAI_API_URL=https://6vq2bcqphcansrs9b88ztxfs88oqy7etah2ugudytv2x.node.k8s.prd.nos.ci/v1
MODEL_NAME=Qwen3.5-27B-AWQ-4bit
```

For local development with another provider, update `OPENAI_API_URL` and `MODEL_NAME`.

### 3. Run Locally

```bash
bun run dev
```

The agent starts on `http://localhost:3000` with the ElizaOS chat UI.

### 4. Run the Custom Frontend

```bash
npm run frontend
```

Opens the Sentinel-branded research terminal at `http://localhost:5173`:
- Dark themed research terminal
- Quick action buttons for common queries
- Real-time streaming responses via Socket.IO
- Markdown rendering for formatted analysis
- Response time tracking
- Mobile responsive layout

### 5. Deploy to Nosana

```bash
# Build Docker image
docker build -t sentinel-agent:latest .

# Tag and push to GHCR
docker tag sentinel-agent:latest ghcr.io/himanshu748/sentinel-nosana-agent:latest
docker push ghcr.io/himanshu748/sentinel-nosana-agent:latest
```

Then deploy via the [Nosana Dashboard](https://deploy.nosana.com/) using the job definition in `nos_job_def/`, or use the deploy scripts:

```bash
# Shell script
NOSANA_API_KEY=your_key bash scripts/deploy-nosana.sh

# Or Node.js SDK
NOSANA_API_KEY=your_key node scripts/deploy.mjs
```

---

## Project Structure

```
sentinel-nosana-agent/
├── src/
│   ├── index.ts                    # Project entry — plugin + Project export
│   ├── actions/
│   │   ├── marketBriefing.ts       # Market overview action
│   │   ├── tokenAnalysis.ts        # Single token deep-dive (40+ tokens)
│   │   ├── newsDigest.ts           # News aggregation
│   │   ├── researchTopic.ts        # Open-ended multi-source research
│   │   └── nosanaEcosystem.ts      # NOS token & Nosana network
│   ├── providers/
│   │   ├── coingecko.ts            # CoinGecko price/market data (60s cache)
│   │   ├── defillama.ts            # DeFiLlama TVL/protocol data (120s cache)
│   │   ├── rssFeed.ts              # RSS news aggregation (3min cache)
│   │   └── solanaOnChain.ts        # Solana RPC on-chain data
│   ├── evaluators/
│   │   ├── freshness.ts            # Data staleness detection
│   │   └── sourceQuality.ts        # Source diversity scoring
│   ├── utils/
│   │   └── cache.ts                # Generic TTL cache layer
│   └── __tests__/                  # 60+ test cases
│       ├── cache.test.ts
│       ├── providers.test.ts
│       ├── plugin.test.ts
│       ├── actions.test.ts
│       ├── evaluators.test.ts
│       └── rssFeed.test.ts
├── frontend/
│   ├── index.html                  # Sentinel chat UI
│   ├── style.css                   # Dark theme styles
│   ├── app.js                      # Socket.IO client + streaming
│   └── serve.js                    # Dev server with backend proxy
├── characters/
│   └── sentinel.character.json     # Agent personality & config
├── nos_job_def/
│   └── nosana_eliza_job_definition.json  # Nosana deployment config
├── scripts/
│   ├── deploy-nosana.sh            # Shell deploy script
│   └── deploy.mjs                  # Node.js SDK deploy script
├── .github/workflows/
│   └── docker-publish.yml          # CI: build + push to GHCR
├── vitest.config.ts
├── Dockerfile
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

**60+ test cases** across 6 test suites covering:

- **Cache utility** — TTL behavior, expiry, key isolation, clearing
- **Provider formatters** — USD/percentage formatting edge cases
- **Plugin structure** — All 5 actions, 4 providers, 2 evaluators properly registered
- **Action handlers** — Callback invocation, error handling, graceful degradation
- **Evaluator logic** — Freshness detection, source quality scoring
- **RSS parser** — XML extraction, CDATA handling, edge cases

---

## Design Decisions

1. **No paid API keys** — All data sources are free and open. CoinGecko free tier, DeFiLlama (fully open), RSS feeds (public), Solana public RPC. Anyone can clone and run Sentinel without signing up for anything.

2. **Graceful degradation** — If a data source is down or rate-limited, the agent works with available sources and transparently notes what's missing.

3. **Structured output** — Every response follows a consistent format: Summary, Key Data, Analysis, Sources. This makes responses scannable and trustworthy.

4. **60k context window** — The Qwen3.5-27B model's large context injects rich data from multiple sources before generating each response, enabling truly data-driven analysis.

5. **Evaluators for quality** — Freshness checks ensure data isn't stale, and source quality scoring tracks how many independent sources back each response.

6. **Response caching** — CoinGecko (60s), DeFiLlama (120s), and RSS feeds (3min) are cached to prevent rate limiting and improve response latency.

7. **Custom frontend** — A Sentinel-branded research terminal with quick action buttons, real-time streaming, response time tracking, and mobile support.

8. **Word-boundary token matching** — Token analysis uses exact word matching (not substring) to correctly identify tokens like SOL without matching "solution".

---

## Nosana Integration

Sentinel runs on Nosana's decentralized GPU network:

- **Inference:** Qwen3.5-27B-AWQ-4bit hosted on Nosana nodes
- **Embeddings:** Qwen3-Embedding-0.6B on Nosana
- **Deployment:** Docker container deployed via Nosana job definition
- **Resource efficient:** Cached responses and optimized prompts minimize GPU usage
- **Self-referential:** The Nosana Ecosystem action pulls live NOS data — Sentinel knows about its own infrastructure

---

## License

MIT

---

## Acknowledgements

- [Nosana](https://nosana.com) — Decentralized GPU compute
- [ElizaOS](https://elizaos.ai) — AI agent framework
- [CoinGecko](https://coingecko.com) — Market data API
- [DeFiLlama](https://defillama.com) — DeFi TVL data
- Built for the Nosana x ElizaOS Builders Challenge 2026
