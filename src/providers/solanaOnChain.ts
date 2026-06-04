import type { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";

interface RPCResponse<T> {
  result: T;
}

interface EpochInfo {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  absoluteSlot: number;
  blockHeight: number;
  transactionCount: number;
}

interface PerfSample {
  numTransactions: number;
  numSlots: number;
  samplePeriodSecs: number;
  slot: number;
}

interface Supply {
  value: {
    total: number;
    circulating: number;
    nonCirculating: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeEpochInfo(value: unknown): EpochInfo | null {
  if (!isRecord(value)) return null;
  const epoch = finiteNumber(value.epoch);
  const slotIndex = finiteNumber(value.slotIndex);
  const slotsInEpoch = finiteNumber(value.slotsInEpoch);
  const absoluteSlot = finiteNumber(value.absoluteSlot);
  const blockHeight = finiteNumber(value.blockHeight);
  const transactionCount = finiteNumber(value.transactionCount);

  if (epoch == null || slotIndex == null || slotsInEpoch == null || slotsInEpoch <= 0 || absoluteSlot == null || blockHeight == null) {
    return null;
  }

  return {
    epoch,
    slotIndex,
    slotsInEpoch,
    absoluteSlot,
    blockHeight,
    transactionCount: transactionCount ?? 0,
  };
}

function sanitizePerfSample(value: unknown): PerfSample | null {
  if (!isRecord(value)) return null;
  const numTransactions = finiteNumber(value.numTransactions);
  const numSlots = finiteNumber(value.numSlots);
  const samplePeriodSecs = finiteNumber(value.samplePeriodSecs);
  const slot = finiteNumber(value.slot);
  if (numTransactions == null || numSlots == null || samplePeriodSecs == null || samplePeriodSecs <= 0 || slot == null) {
    return null;
  }
  return { numTransactions, numSlots, samplePeriodSecs, slot };
}

function sanitizeSupply(value: unknown): Supply | null {
  if (!isRecord(value) || !isRecord(value.value)) return null;
  const total = finiteNumber(value.value.total);
  const circulating = finiteNumber(value.value.circulating);
  const nonCirculating = finiteNumber(value.value.nonCirculating);
  if (total == null || circulating == null || nonCirculating == null) return null;
  return { value: { total, circulating, nonCirculating } };
}

async function rpcCall<T>(method: string, params: unknown[] = []): Promise<T | null> {
  try {
    const res = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RPCResponse<T>;
    return isRecord(data) && "result" in data ? data.result : null;
  } catch {
    return null;
  }
}

async function getEpochInfo(): Promise<EpochInfo | null> {
  const data = await rpcCall<unknown>("getEpochInfo");
  return sanitizeEpochInfo(data);
}

async function getRecentPerformance(): Promise<PerfSample[]> {
  const data = await rpcCall<unknown>("getRecentPerformanceSamples", [5]);
  return Array.isArray(data)
    ? data.map(sanitizePerfSample).filter((sample): sample is PerfSample => sample !== null)
    : [];
}

async function getSupply(): Promise<Supply | null> {
  const data = await rpcCall<unknown>("getSupply");
  return sanitizeSupply(data);
}

function formatSOL(lamports: number): string {
  if (!Number.isFinite(lamports)) return "N/A";
  const sol = lamports / 1e9;
  if (sol >= 1e9) return `${(sol / 1e9).toFixed(2)}B SOL`;
  if (sol >= 1e6) return `${(sol / 1e6).toFixed(2)}M SOL`;
  return `${sol.toFixed(0)} SOL`;
}

export const solanaOnChainProvider: Provider = {
  name: "solanaOnChain",
  description: "Solana blockchain on-chain data via RPC",
  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const [epochInfo, perfSamples, supply] = await Promise.all([
      getEpochInfo(),
      getRecentPerformance(),
      getSupply(),
    ]);

    const parts: string[] = ["[Solana On-Chain Data]"];
    const timestamp = new Date().toISOString();
    parts.push(`Fetched: ${timestamp}`);

    if (epochInfo) {
      parts.push(`\nEpoch: ${epochInfo.epoch}`);
      parts.push(`Block Height: ${epochInfo.blockHeight.toLocaleString()}`);
      parts.push(`Total Transactions: ${epochInfo.transactionCount?.toLocaleString() ?? "N/A"}`);
      const epochProgress = ((epochInfo.slotIndex / epochInfo.slotsInEpoch) * 100).toFixed(1);
      parts.push(`Epoch Progress: ${epochProgress}%`);
    } else {
      parts.push("\nEpoch data: unavailable (RPC error)");
    }

    if (perfSamples.length > 0) {
      const avgTps =
        perfSamples.reduce((sum, s) => sum + s.numTransactions / s.samplePeriodSecs, 0) /
        perfSamples.length;
      parts.push(`\nAvg TPS (recent): ${avgTps.toFixed(0)}`);
    }

    if (supply) {
      parts.push(`\nTotal Supply: ${formatSOL(supply.value.total)}`);
      parts.push(`Circulating: ${formatSOL(supply.value.circulating)}`);
      parts.push(`Non-Circulating: ${formatSOL(supply.value.nonCirculating)}`);
    } else {
      parts.push("\nSupply data: unavailable");
    }

    return { text: parts.join("\n") };
  },
};

export { getEpochInfo, getRecentPerformance, getSupply };
