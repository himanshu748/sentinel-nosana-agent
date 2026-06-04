import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { formatUSD, formatPct, getCoinData, getGlobalData, getTopCoins } from "../providers/coingecko.js";
import { getChainTVLs, getTopProtocols } from "../providers/defillama.js";
import { getEpochInfo, getRecentPerformance } from "../providers/solanaOnChain.js";
import { clearCache } from "../utils/cache.js";

function mockFetchJSON(data: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(data),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  clearCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CoinGecko formatUSD", () => {
  it("formats trillions", () => {
    expect(formatUSD(2.5e12)).toBe("$2.50T");
  });

  it("formats billions", () => {
    expect(formatUSD(1.234e9)).toBe("$1.23B");
  });

  it("formats millions", () => {
    expect(formatUSD(456e6)).toBe("$456.00M");
  });

  it("formats thousands", () => {
    expect(formatUSD(7890)).toBe("$7.89K");
  });

  it("formats small values", () => {
    expect(formatUSD(42.5)).toBe("$42.50");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });

  it("returns N/A for invalid numbers", () => {
    expect(formatUSD(Number.NaN)).toBe("N/A");
    expect(formatUSD(Number.POSITIVE_INFINITY)).toBe("N/A");
  });
});

describe("CoinGecko formatPct", () => {
  it("formats positive percentage", () => {
    expect(formatPct(5.6)).toBe("+5.6%");
  });

  it("formats negative percentage", () => {
    expect(formatPct(-3.2)).toBe("-3.2%");
  });

  it("formats zero", () => {
    expect(formatPct(0)).toBe("+0.0%");
  });

  it("returns N/A for null", () => {
    expect(formatPct(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatPct(undefined)).toBe("N/A");
  });

  it("returns N/A for invalid percentages", () => {
    expect(formatPct(Number.NaN)).toBe("N/A");
  });
});

describe("CoinGecko provider payload validation", () => {
  it("filters malformed market rows before returning top coins", async () => {
    mockFetchJSON([
      {
        id: "bitcoin",
        symbol: "btc",
        name: "Bitcoin",
        current_price: 70000,
        market_cap: 1_300_000_000_000,
        market_cap_rank: 1,
        total_volume: 40_000_000_000,
        price_change_percentage_24h: 2.5,
      },
      {
        id: "broken",
        symbol: "bad",
        name: "Broken",
        current_price: "not-a-number",
        market_cap: null,
        market_cap_rank: 99,
        total_volume: 1,
        price_change_percentage_24h: 1,
      },
    ]);

    const coins = await getTopCoins(2);

    expect(coins).toHaveLength(1);
    expect(coins[0].id).toBe("bitcoin");
  });

  it("returns null when global data is missing required USD numbers", async () => {
    mockFetchJSON({
      data: {
        total_market_cap: { eur: 100 },
        total_volume: { usd: 50 },
        market_cap_change_percentage_24h_usd: 1.2,
      },
    });

    await expect(getGlobalData()).resolves.toBeNull();
  });

  it("encodes token ids before calling the markets endpoint", async () => {
    const fetchMock = mockFetchJSON([]);

    await getCoinData("token/with space");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("ids=token%2Fwith%20space");
  });
});

describe("DeFiLlama provider payload validation", () => {
  it("drops malformed protocols and keeps valid TVL rows", async () => {
    mockFetchJSON([
      { name: "Aave", tvl: 10_000_000_000, chains: ["Ethereum"], change_1d: 1, change_7d: 2 },
      { name: "Broken", tvl: "huge", chains: ["Ethereum"] },
    ]);

    const protocols = await getTopProtocols(5);

    expect(protocols).toHaveLength(1);
    expect(protocols[0].name).toBe("Aave");
    expect(protocols[0].category).toBe("Uncategorized");
  });

  it("filters malformed chain TVL records before sorting", async () => {
    mockFetchJSON([
      { name: "Solana", tvl: 8_000_000_000 },
      { name: "BadChain", tvl: Number.NaN },
      { tvl: 10_000_000_000 },
    ]);

    const chains = await getChainTVLs();

    expect(chains).toEqual([{ name: "Solana", tvl: 8_000_000_000 }]);
  });
});

describe("Solana RPC provider payload validation", () => {
  it("rejects malformed epoch info that would produce invalid progress", async () => {
    mockFetchJSON({
      result: {
        epoch: 1,
        slotIndex: 10,
        slotsInEpoch: 0,
        absoluteSlot: 100,
        blockHeight: 90,
        transactionCount: 1000,
      },
    });

    await expect(getEpochInfo()).resolves.toBeNull();
  });

  it("filters performance samples that would divide by zero", async () => {
    mockFetchJSON({
      result: [
        { numTransactions: 1000, numSlots: 10, samplePeriodSecs: 0, slot: 1 },
        { numTransactions: 2000, numSlots: 20, samplePeriodSecs: 10, slot: 2 },
      ],
    });

    const samples = await getRecentPerformance();

    expect(samples).toEqual([{ numTransactions: 2000, numSlots: 20, samplePeriodSecs: 10, slot: 2 }]);
  });
});
