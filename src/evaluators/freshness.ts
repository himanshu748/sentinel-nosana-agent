import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function extractTimestamps(text: string): Date[] {
  const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g;
  const matches = text.match(isoRegex) ?? [];
  return matches
    .map((m) => new Date(m.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(m) ? m : m + "Z"))
    .filter((d) => !isNaN(d.getTime()));
}

export const freshnessEvaluator: Evaluator = {
  name: "FRESHNESS_CHECK",
  description:
    "Evaluates whether the data used in the agent's response is fresh (within 5 minutes). Flags stale data so the agent can warn the user.",
  similes: ["DATA_FRESHNESS", "STALE_CHECK"],
  alwaysRun: true,
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory
  ): Promise<boolean> => {
    const text = message.content.text ?? "";
    return text.includes("[CoinGecko") || text.includes("[DeFiLlama") || text.includes("[Solana") || text.includes("[Crypto News");
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ) => {
    const text = message.content.text ?? "";
    const timestamps = extractTimestamps(text);
    const now = Date.now();
    let staleCount = 0;

    for (const ts of timestamps) {
      const age = now - ts.getTime();
      if (age > STALE_THRESHOLD_MS) {
        staleCount++;
      }
    }

    return {
      success: staleCount === 0,
      text: staleCount > 0
        ? `${staleCount} data point(s) are stale (older than 5 minutes)`
        : "All data points are fresh",
    };
  },
  examples: [
    {
      prompt: "Agent response contains market data with timestamps",
      messages: [
        { name: "{{user1}}", content: { text: "Market briefing please" } },
      ],
      outcome: "Check if data timestamps are within 5 minutes of current time",
    },
  ],
};
