import type { Action, IAgentRuntime, Memory, HandlerCallback, State } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getTopCoins, getGlobalData, formatUSD, formatPct } from "../providers/coingecko.js";
import { getTopProtocols, getChainTVLs } from "../providers/defillama.js";
import { getAllNews } from "../providers/rssFeed.js";
import { getEpochInfo, getRecentPerformance } from "../providers/solanaOnChain.js";
import { safeActionError } from "../utils/errors.js";

async function gatherAllData(): Promise<{
  marketData: string;
  defiData: string;
  solanaData: string;
  newsData: string;
}> {
  const [topCoins, globalData, protocols, chains, news, epochInfo, perfSamples] =
    await Promise.all([
      getTopCoins(15),
      getGlobalData(),
      getTopProtocols(10),
      getChainTVLs(),
      getAllNews(),
      getEpochInfo(),
      getRecentPerformance(),
    ]);

  const marketParts: string[] = [];
  if (globalData) {
    marketParts.push(
      `Global MCap: ${formatUSD(globalData.total_market_cap.usd)} (${formatPct(globalData.market_cap_change_percentage_24h_usd)} 24h)`
    );
    marketParts.push(`24h Volume: ${formatUSD(globalData.total_volume.usd)}`);
  }
  if (topCoins.length > 0) {
    for (const c of topCoins) {
      marketParts.push(
        `${c.symbol.toUpperCase()}: $${c.current_price.toLocaleString()} (${formatPct(c.price_change_percentage_24h)} 24h)`
      );
    }
  }

  const defiParts: string[] = [];
  if (chains.length > 0) {
    const totalTVL = chains.reduce((s, c) => s + c.tvl, 0);
    defiParts.push(`Total DeFi TVL: ${formatUSD(totalTVL)}`);
    for (const c of chains.slice(0, 8)) {
      defiParts.push(`${c.name}: ${formatUSD(c.tvl)}`);
    }
  }
  if (protocols.length > 0) {
    defiParts.push("\nTop protocols:");
    for (const p of protocols) {
      defiParts.push(`${p.name}: ${formatUSD(p.tvl)} (${p.category})`);
    }
  }

  const solanaParts: string[] = [];
  if (epochInfo) {
    solanaParts.push(`Epoch: ${epochInfo.epoch}, Block Height: ${epochInfo.blockHeight.toLocaleString()}`);
  }
  if (perfSamples.length > 0) {
    const avgTps =
      perfSamples.reduce((s, p) => s + p.numTransactions / p.samplePeriodSecs, 0) /
      perfSamples.length;
    solanaParts.push(`Avg TPS: ${avgTps.toFixed(0)}`);
  }

  const newsParts = news
    .slice(0, 10)
    .map((n) => `[${n.source}] ${n.title}`);

  return {
    marketData: marketParts.join("\n") || "Market data unavailable",
    defiData: defiParts.join("\n") || "DeFi data unavailable",
    solanaData: solanaParts.join("\n") || "Solana data unavailable",
    newsData: newsParts.join("\n") || "News data unavailable",
  };
}

export const researchTopicAction: Action = {
  name: "RESEARCH_TOPIC",
  description:
    "Deep-dive research on any crypto/DeFi topic using data from all available sources (CoinGecko, DeFiLlama, RSS feeds, Solana RPC).",
  similes: [
    "RESEARCH",
    "DEEP_DIVE",
    "INVESTIGATE",
    "EXPLORE_TOPIC",
    "STUDY",
    "ANALYZE_TOPIC",
  ],
  validate: async () => true,
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const { marketData, defiData, solanaData, newsData } = await gatherAllData();
      const userMsg = message.content.text ?? "";

    const prompt = `You are Sentinel, a crypto research analyst. The user wants to research a specific topic. Use ALL the data provided to give a thorough, data-backed analysis.

Structure your response as:
**Research: [TOPIC]**

**Summary:** 3-4 sentence overview answering the user's question.

**Key Data Points:** Relevant numbers and metrics from the data sources.

**Analysis:** Detailed interpretation. Connect data points. Identify trends.

**Risk Factors:** What could go wrong or what's uncertain.

**Further Research:** 2-3 specific follow-up questions the user might want to explore.

**Sources:** List all data sources used.

Available data:

Market Data:
${marketData}

DeFi Data:
${defiData}

Solana On-Chain Data:
${solanaData}

Recent News Headlines:
${newsData}

User's research question: ${userMsg}`;

    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });

      if (callback) {
        await callback({ text: response, action: "RESEARCH_TOPIC" });
      }
      return { text: response, success: true };
    } catch {
      const errorMsg = "I encountered an issue during research. Some data sources may be temporarily unavailable.";
      if (callback) {
        await callback({ text: errorMsg, action: "RESEARCH_TOPIC" });
      }
      return { text: errorMsg, success: false, error: safeActionError() };
    }
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "Research the state of Solana DeFi" } },
      { name: "{{agentName}}", content: { text: "Gathering data from all sources for a deep dive...", action: "RESEARCH_TOPIC" } },
    ],
    [
      { name: "{{user1}}", content: { text: "What's happening with Layer 2 scaling?" } },
      { name: "{{agentName}}", content: { text: "Pulling market data, DeFi metrics, and news for your research...", action: "RESEARCH_TOPIC" } },
    ],
  ],
};
