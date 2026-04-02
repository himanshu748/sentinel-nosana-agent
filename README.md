# Sentinel — Personal Crypto Research Agent

> A personal crypto research analyst powered by [ElizaOS](https://elizaos.ai) and [Nosana](https://nosana.com) decentralized GPU compute.

Built for the **Nosana x ElizaOS Builders Challenge** (April 2026).

---

## What is Sentinel?

Sentinel is an autonomous AI agent that monitors, analyzes, and synthesizes crypto/DeFi intelligence from multiple on-chain and off-chain data sources. Ask a question, get a data-backed briefing — powered entirely by decentralized infrastructure.

**No paid API keys. No centralized cloud. Just open data + decentralized compute.**

Inspired by the [OpenClaw](https://openclaw.org) philosophy: your AI, your data, your control.

---

## Features

| Command | Description | Data Sources |
|---------|-------------|-------------|
| **Market Briefing** | Full market overview with prices, volume, DeFi TVL, top movers | CoinGecko + DeFiLlama |
| **Token Analysis** | Deep-dive on any token with price, on-chain metrics, risk factors | CoinGecko + DeFiLlama |
| **News Digest** | Aggregated headlines from top crypto news outlets | CoinDesk, CoinTelegraph, The Block |
| **Research Topic** | Open-ended research using ALL data sources | All 4 providers |
| **Nosana Ecosystem** | NOS token analysis and Nosana network overview | CoinGecko + Nosana Network |

### Example Queries

```
"Give me a market briefing"
"Analyze SOL for me"
"What's the latest crypto news?"
"Research the state of Solana DeFi"
"Tell me about Ethereum's DeFi ecosystem"
"What's happening with Bitcoin this week?"
"What's the NOS price?"
"Tell me about Nosana"
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

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) or [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) (for Docker builds)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/sentinel-agent.git
cd sentinel-agent
cp .env.example .env
bun install
```

### 2. Run Locally

```bash
bun run dev
```

The agent starts on `http://localhost:3000`. The built-in ElizaOS chat UI is available at that URL.

### 3. Run the Custom Frontend

```bash
# In a separate terminal:
npm run frontend
```

Opens the Sentinel-branded research terminal at `http://localhost:5173`. Features:
- Dark themed chat UI matching Nosana aesthetics
- Quick action buttons for common queries (Market Briefing, NOS Price, News, etc.)
- Real-time streaming responses via Socket.IO
- Markdown rendering for formatted analysis
- Mobile responsive layout

### 4. Deploy to Nosana

```bash
# Build Docker image
docker build -t sentinel-agent:latest .

# Push to registry
docker tag sentinel-agent:latest YOUR_REGISTRY/sentinel-agent:latest
docker push YOUR_REGISTRY/sentinel-agent:latest

# Deploy via Nosana CLI
nosana job post --file nos_job_def/nosana_eliza_job_definition.json --market GPU
```

---

## Project Structure

```
sentinel-agent/
├── src/
│   ├── index.ts                    # Project entry point
│   ├── actions/
│   │   ├── marketBriefing.ts       # Market overview action
│   │   ├── tokenAnalysis.ts        # Single token deep-dive
│   │   ├── newsDigest.ts           # News aggregation
│   │   ├── researchTopic.ts        # Open-ended research
│   │   └── nosanaEcosystem.ts      # NOS token & Nosana network
│   ├── providers/
│   │   ├── coingecko.ts            # CoinGecko price/market data (60s cache)
│   │   ├── defillama.ts            # DeFiLlama TVL/protocol data (120s cache)
│   │   ├── rssFeed.ts              # RSS news aggregation
│   │   └── solanaOnChain.ts        # Solana RPC on-chain data
│   ├── evaluators/
│   │   ├── freshness.ts            # Data staleness detection
│   │   └── sourceQuality.ts        # Source diversity scoring
│   ├── utils/
│   │   └── cache.ts                # Generic TTL cache layer
│   └── __tests__/                  # 60+ test cases
│       ├── cache.test.ts           # Cache utility tests
│       ├── providers.test.ts       # Provider formatter tests
│       ├── plugin.test.ts          # Plugin structure validation
│       ├── actions.test.ts         # Action handler tests
│       ├── evaluators.test.ts      # Evaluator logic tests
│       └── rssFeed.test.ts         # RSS parser tests
├── frontend/
│   ├── index.html                  # Sentinel chat UI
│   ├── style.css                   # Dark theme styles
│   ├── app.js                      # Socket.IO client
│   └── serve.js                    # Dev server with backend proxy
├── characters/
│   └── sentinel.character.json     # Agent personality & config
├── nos_job_def/
│   └── nosana_eliza_job_definition.json
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
- **Plugin structure** — All actions, providers, evaluators properly registered
- **Action handlers** — Callback invocation, error handling, graceful degradation
- **Evaluator logic** — Freshness detection, source quality scoring
- **RSS parser** — XML extraction, CDATA handling, edge cases

---

## Design Decisions

1. **No paid API keys** — All data sources are free and open. CoinGecko free tier, DeFiLlama (fully open), RSS feeds (public), Solana public RPC. This means anyone can clone and run Sentinel without signing up for anything.

2. **Graceful degradation** — If a data source is down or rate-limited, the agent works with available sources and transparently notes what's missing.

3. **Structured output** — Every response follows a consistent format: Summary, Key Data, Analysis, Sources. This makes responses scannable and trustworthy.

4. **60k context window** — The Qwen3.5-27B model's large context is used to inject rich data from multiple sources before generating each response, enabling truly data-driven analysis.

5. **Evaluators for quality** — Freshness checks ensure data isn't stale, and source quality scoring tracks how many independent sources back each response.

6. **Response caching** — CoinGecko (60s) and DeFiLlama (120s) responses are cached to prevent rate limiting and improve response latency.

7. **Custom frontend** — A Sentinel-branded chat UI connects via Socket.IO for real-time streaming responses, with quick action buttons for the most common queries.

---

## Nosana Integration

Sentinel runs on Nosana's decentralized GPU network:

- **Inference:** Qwen3.5-27B-AWQ-4bit hosted on Nosana nodes
- **Embeddings:** Qwen3-Embedding-0.6B on Nosana
- **Deployment:** Docker container deployed via Nosana job definition
- **Resource efficient:** Optimized prompts and response caching minimize GPU usage

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
