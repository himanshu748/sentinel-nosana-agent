import type { Action, IAgentRuntime, Memory, HandlerCallback, State } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getCoinData, formatUSD, formatPct } from "../providers/coingecko.js";
import { getProtocolByName } from "../providers/defillama.js";

const TOKEN_MAP: Record<string, string> = {
  btc: "bitcoin", bitcoin: "bitcoin",
  eth: "ethereum", ethereum: "ethereum",
  sol: "solana", solana: "solana",
  bnb: "binancecoin", binance: "binancecoin",
  xrp: "ripple", ripple: "ripple",
  ada: "cardano", cardano: "cardano",
  doge: "dogecoin", dogecoin: "dogecoin",
  dot: "polkadot", polkadot: "polkadot",
  avax: "avalanche-2", avalanche: "avalanche-2",
  matic: "matic-network", polygon: "matic-network",
  link: "chainlink", chainlink: "chainlink",
  uni: "uniswap", uniswap: "uniswap",
  aave: "aave",
  mkr: "maker", maker: "maker",
  nos: "nosana", nosana: "nosana",
  jup: "jupiter-exchange-solana", jupiter: "jupiter-exchange-solana",
  ray: "raydium", raydium: "raydium",
  jto: "jito-governance-token", jito: "jito-governance-token",
  sui: "sui", apt: "aptos", aptos: "aptos",
  arb: "arbitrum", arbitrum: "arbitrum",
  op: "optimism", optimism: "optimism",
  atom: "cosmos", cosmos: "cosmos",
  near: "near", fil: "filecoin", filecoin: "filecoin",
  stx: "blockstack", icp: "internet-computer",
  ton: "the-open-network", tia: "celestia", celestia: "celestia",
  render: "render-token", rndr: "render-token",
  wif: "dogwifcoin", bonk: "bonk", pepe: "pepe",
  ldo: "lido-dao", lido: "lido-dao",
  crv: "curve-dao-token", curve: "curve-dao-token",
  pendle: "pendle", eigen: "eigenlayer",
  pyth: "pyth-network",
};

const STOP_WORDS = new Set([
  "me", "my", "the", "a", "an", "for", "can", "you", "your",
  "analyze", "analysis", "token", "about", "tell", "what", "how",
  "is", "are", "do", "does", "give", "get", "show", "please",
  "want", "like", "think", "price", "of", "in", "on", "it",
  "this", "that", "with", "and", "or", "but", "not", "to",
]);

function extractTokenId(text: string): string {
  const words = text.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));

  for (const w of words) {
    if (TOKEN_MAP[w]) return TOKEN_MAP[w];
  }

  for (const w of words) {
    if (w.length >= 3 && !STOP_WORDS.has(w)) return w;
  }
  return "bitcoin";
}

async function gatherTokenData(tokenId: string): Promise<string> {
  const [coinData, protocolData] = await Promise.all([
    getCoinData(tokenId),
    getProtocolByName(tokenId),
  ]);

  const parts: string[] = [];

  if (coinData) {
    parts.push(`Token: ${coinData.name} (${coinData.symbol.toUpperCase()})`);
    parts.push(`Price: $${coinData.current_price.toLocaleString()}`);
    parts.push(`Market Cap: ${formatUSD(coinData.market_cap)} (#${coinData.market_cap_rank})`);
    parts.push(`24h Volume: ${formatUSD(coinData.total_volume)}`);
    parts.push(`24h Change: ${formatPct(coinData.price_change_percentage_24h)}`);
    parts.push(`7d Change: ${formatPct(coinData.price_change_percentage_7d_in_currency)}`);
  } else {
    parts.push(`Token "${tokenId}" not found on CoinGecko. Data may be limited.`);
  }

  if (protocolData) {
    parts.push(`\nDeFi Protocol: ${protocolData.name}`);
    parts.push(`Category: ${protocolData.category}`);
    parts.push(`TVL: ${formatUSD(protocolData.tvl)}`);
    parts.push(`1d TVL Change: ${formatPct(protocolData.change_1d)}`);
    parts.push(`7d TVL Change: ${formatPct(protocolData.change_7d)}`);
    parts.push(`Chains: ${protocolData.chains.join(", ")}`);
  }

  return parts.join("\n");
}

export const tokenAnalysisAction: Action = {
  name: "TOKEN_ANALYSIS",
  description:
    "Analyze a specific cryptocurrency token with price data from CoinGecko and DeFi metrics from DeFiLlama.",
  similes: [
    "ANALYZE_TOKEN",
    "TOKEN_REPORT",
    "COIN_ANALYSIS",
    "RESEARCH_TOKEN",
    "TOKEN_INFO",
    "TELL_ME_ABOUT_TOKEN",
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
      const tokenId = extractTokenId(message.content.text ?? "");
      const tokenData = await gatherTokenData(tokenId);
      const userMsg = message.content.text ?? "";

      const prompt = `You are Sentinel, a crypto research analyst. Analyze the token based on the data below.

Structure your response as:
**Token Analysis: [TOKEN NAME] ([SYMBOL])**

**Price & Market Data:**
- Current price, market cap, rank, 24h volume, price changes

**DeFi Presence:** (if available)
- TVL data, protocol info, chain presence

**Strengths:** 2-3 bullet points on positive indicators

**Risk Factors:** 2-3 bullet points on risks or concerns

**Analysis:** 2-3 sentence interpretation of the data.

**Sources:** CoinGecko, DeFiLlama

Here is the token data:

${tokenData}

User message: ${userMsg}`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });

      if (callback) {
        await callback({ text: response, action: "TOKEN_ANALYSIS" });
      }
      return { text: response, success: true };
    } catch (err) {
      const errorMsg = "I encountered an issue analyzing this token. Some data sources may be temporarily unavailable.";
      if (callback) {
        await callback({ text: errorMsg, action: "TOKEN_ANALYSIS" });
      }
      return { text: errorMsg, success: false, error: String(err) };
    }
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "Analyze SOL for me" } },
      { name: "{{agentName}}", content: { text: "Pulling Solana data for analysis...", action: "TOKEN_ANALYSIS" } },
    ],
    [
      { name: "{{user1}}", content: { text: "Tell me about Ethereum" } },
      { name: "{{agentName}}", content: { text: "Fetching Ethereum metrics from multiple sources...", action: "TOKEN_ANALYSIS" } },
    ],
  ],
};
