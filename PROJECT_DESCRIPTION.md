# Sentinel — Project Description (Nosana x ElizaOS Builders Challenge)

**Sentinel** is a personal crypto research agent that transforms raw blockchain and market data into actionable intelligence briefings — powered entirely by decentralized infrastructure on the Nosana GPU network.

## The Problem

Crypto research today means juggling dozens of tabs: CoinGecko for prices, DeFiLlama for TVL, Twitter for news, block explorers for on-chain data. Centralized research platforms gate this behind expensive subscriptions and harvest your data. There's no personal, private, always-available research analyst that runs on YOUR infrastructure.

## The Solution

Sentinel is an ElizaOS v2 agent with a custom plugin that aggregates five real-time data sources — CoinGecko (market data), DeFiLlama (DeFi TVL/protocols), crypto news RSS feeds (CoinDesk, CoinTelegraph, The Block), Solana's public RPC (on-chain metrics), and Nosana network data — then synthesizes them through Qwen3.5-9B-FP8 running on Nosana's decentralized GPU network.

**Five core capabilities:**
- **Market Briefings:** Full market overview with prices, volume, DeFi TVL, and top movers
- **Token Analysis:** Deep-dive on any of 40+ tokens combining price data with DeFi protocol metrics
- **News Digests:** Aggregated and summarized headlines from three major crypto outlets
- **Research Topics:** Open-ended research queries using all data sources simultaneously
- **Nosana Ecosystem:** Live NOS token data and Nosana network status with GPU compute insights

**Quality assurance via two evaluators:**
- **Freshness Check:** Ensures all data points are within 5 minutes of current time
- **Source Quality:** Scores response confidence based on diversity of data sources used

## Why It Matters

- **Zero paid API keys** — every data source is free and open, so anyone can clone and run it
- **Graceful degradation** — if sources are down, the agent works with what's available and says so
- **Structured output** — every response follows Summary > Data > Analysis > Sources format
- **Custom frontend** — branded research terminal with quick actions, streaming, and mobile support
- **Decentralized end-to-end** — inference on Nosana GPUs, data from open APIs, no centralized dependencies
- **60+ test cases** — comprehensive test suite covering actions, providers, evaluators, and plugin structure

**Tech:** ElizaOS v2 / TypeScript / 4 providers / 5 actions / 2 evaluators / Qwen3.5-9B on Nosana / Docker / Custom Frontend
