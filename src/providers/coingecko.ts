import type { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";
import { cached } from "../utils/cache.js";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const CACHE_TTL = 60_000; // 60s

interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
}

interface GlobalData {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_change_percentage_24h_usd: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeCoinMarketData(value: unknown): CoinMarketData | null {
  if (!isRecord(value)) return null;
  const currentPrice = finiteNumber(value.current_price);
  const marketCap = finiteNumber(value.market_cap);
  const marketCapRank = finiteNumber(value.market_cap_rank);
  const totalVolume = finiteNumber(value.total_volume);
  const change24h = finiteNumber(value.price_change_percentage_24h);
  const id = typeof value.id === "string" ? value.id : "";
  const symbol = typeof value.symbol === "string" ? value.symbol : "";
  const name = typeof value.name === "string" ? value.name : "";

  if (!id || !symbol || !name || currentPrice == null || marketCap == null || marketCapRank == null || totalVolume == null || change24h == null) {
    return null;
  }

  const change7d = finiteNumber(value.price_change_percentage_7d_in_currency);
  return {
    id,
    symbol,
    name,
    current_price: currentPrice,
    market_cap: marketCap,
    market_cap_rank: marketCapRank,
    total_volume: totalVolume,
    price_change_percentage_24h: change24h,
    price_change_percentage_7d_in_currency: change7d ?? undefined,
  };
}

function sanitizeGlobalData(value: unknown): GlobalData | null {
  if (!isRecord(value)) return null;
  const totalMarketCap = isRecord(value.total_market_cap) ? finiteNumber(value.total_market_cap.usd) : null;
  const totalVolume = isRecord(value.total_volume) ? finiteNumber(value.total_volume.usd) : null;
  const change24h = finiteNumber(value.market_cap_change_percentage_24h_usd);

  if (totalMarketCap == null || totalVolume == null || change24h == null) return null;
  return {
    total_market_cap: { usd: totalMarketCap },
    total_volume: { usd: totalVolume },
    market_cap_change_percentage_24h_usd: change24h,
  };
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getTopCoins(limit = 20): Promise<CoinMarketData[]> {
  return cached(`cg:top:${limit}`, CACHE_TTL, async () => {
    const data = await fetchJSON<unknown>(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=7d`
    );
    return Array.isArray(data)
      ? data.map(sanitizeCoinMarketData).filter((coin): coin is CoinMarketData => coin !== null)
      : [];
  });
}

async function getGlobalData(): Promise<GlobalData | null> {
  return cached("cg:global", CACHE_TTL, async () => {
    const data = await fetchJSON<unknown>(`${COINGECKO_BASE}/global`);
    return isRecord(data) ? sanitizeGlobalData(data.data) : null;
  });
}

async function getCoinData(coinId: string): Promise<CoinMarketData | null> {
  return cached(`cg:coin:${coinId}`, CACHE_TTL, async () => {
    const coins = await fetchJSON<unknown>(
      `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&sparkline=false&price_change_percentage=7d`
    );
    return Array.isArray(coins) ? sanitizeCoinMarketData(coins[0]) : null;
  });
}

function formatUSD(n: number): string {
  if (!Number.isFinite(n)) return "N/A";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "N/A";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export const coingeckoProvider: Provider = {
  name: "coingecko",
  description: "Real-time cryptocurrency market data from CoinGecko",
  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const [topCoins, globalData] = await Promise.all([
      getTopCoins(10),
      getGlobalData(),
    ]);

    const parts: string[] = ["[CoinGecko Market Data]"];
    const timestamp = new Date().toISOString();
    parts.push(`Fetched: ${timestamp}`);

    if (globalData) {
      parts.push(
        `\nGlobal: Market Cap ${formatUSD(globalData.total_market_cap.usd)} (${formatPct(globalData.market_cap_change_percentage_24h_usd)} 24h) | 24h Volume ${formatUSD(globalData.total_volume.usd)}`
      );
    } else {
      parts.push("\nGlobal data: unavailable (API rate limit or error)");
    }

    if (topCoins.length > 0) {
      parts.push("\nTop 10 by Market Cap:");
      for (const c of topCoins) {
        parts.push(
          `  #${c.market_cap_rank} ${c.name} (${c.symbol.toUpperCase()}): $${c.current_price.toLocaleString()} | MCap ${formatUSD(c.market_cap)} | Vol ${formatUSD(c.total_volume)} | 24h ${formatPct(c.price_change_percentage_24h)} | 7d ${formatPct(c.price_change_percentage_7d_in_currency)}`
        );
      }
    } else {
      parts.push("\nTop coins data: unavailable");
    }

    return { text: parts.join("\n") };
  },
};

export { getTopCoins, getGlobalData, getCoinData, formatUSD, formatPct };
