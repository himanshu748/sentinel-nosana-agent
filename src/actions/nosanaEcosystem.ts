import type { Action, IAgentRuntime, Memory, HandlerCallback, State } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getCoinData, formatUSD, formatPct } from "../providers/coingecko.js";
import { cached } from "../utils/cache.js";

const NOSANA_CACHE_TTL = 120_000;

interface NosanaNetworkStats {
  totalNodes: number | null;
  activeJobs: number | null;
  totalGPUs: string | null;
}

async function fetchNosanaStats(): Promise<NosanaNetworkStats> {
  return cached("nosana:stats", NOSANA_CACHE_TTL, async () => {
    try {
      const res = await fetch("https://dashboard.k8s.prd.nos.ci/api/nodes", {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const nodes = Array.isArray(data) ? data : data?.data ?? [];
        return {
          totalNodes: nodes.length || null,
          activeJobs: null,
          totalGPUs: null,
        };
      }
    } catch {}
    return { totalNodes: null, activeJobs: null, totalGPUs: null };
  });
}

async function gatherNosanaData(): Promise<string> {
  const [nosData, solData, networkStats] = await Promise.all([
    getCoinData("nosana"),
    getCoinData("solana"),
    fetchNosanaStats(),
  ]);

  const parts: string[] = [];

  if (nosData) {
    parts.push(`NOS Token: ${nosData.name} (${nosData.symbol.toUpperCase()})`);
    parts.push(`Price: $${nosData.current_price.toLocaleString()}`);
    parts.push(`Market Cap: ${formatUSD(nosData.market_cap)} (#${nosData.market_cap_rank})`);
    parts.push(`24h Volume: ${formatUSD(nosData.total_volume)}`);
    parts.push(`24h Change: ${formatPct(nosData.price_change_percentage_24h)}`);
    parts.push(`7d Change: ${formatPct(nosData.price_change_percentage_7d_in_currency)}`);
  } else {
    parts.push("NOS token data unavailable from CoinGecko");
  }

  if (solData) {
    parts.push(`\nSolana (host chain): $${solData.current_price.toLocaleString()} (${formatPct(solData.price_change_percentage_24h)} 24h)`);
  }

  parts.push("\nNosana Network Info:");
  parts.push("- Decentralized GPU compute network built on Solana");
  parts.push("- Powers AI inference workloads: LLM serving, image generation, embeddings");
  parts.push("- NOS token used for staking by GPU providers and paying for compute");
  parts.push("- Supports open-source models: Qwen, Llama, DeepSeek, Mistral, Stable Diffusion");
  parts.push("- GPU providers earn NOS by sharing idle GPU resources");
  parts.push("- Consumer & enterprise GPUs supported (4090, A100, H100)");
  parts.push("- Deployment dashboard at deploy.nosana.com for one-click container deployments");

  if (networkStats.totalNodes) {
    parts.push(`\nNetwork Nodes: ${networkStats.totalNodes}`);
  }

  parts.push("\nRecent Ecosystem Developments:");
  parts.push("- Nosana x ElizaOS Builders Challenge (April 2026) — community AI agent hackathon");
  parts.push("- Partnership with Zero Query for autonomous trading agents");
  parts.push("- Grants program supporting AI builders ($5K-$50K funding)");
  parts.push("- OpenGPU integration for expanded GPU supply");

  return parts.join("\n");
}

export const nosanaEcosystemAction: Action = {
  name: "NOSANA_ECOSYSTEM",
  description:
    "Get NOS token price, Nosana network status, GPU compute metrics, and ecosystem overview. Specialized action for Nosana-specific queries.",
  similes: [
    "NOS_PRICE",
    "NOSANA_INFO",
    "NOS_TOKEN",
    "NOSANA_STATUS",
    "NOSANA_NETWORK",
    "WHAT_IS_NOSANA",
    "NOS_ANALYSIS",
    "NOSANA_GPU",
    "DECENTRALIZED_COMPUTE",
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
      const nosanaData = await gatherNosanaData();
      const userMsg = message.content.text ?? "";

      const prompt = `You are Sentinel, a crypto research analyst running on the Nosana decentralized GPU network. You have deep expertise in the Nosana ecosystem because you ARE running on it right now.

Analyze the Nosana ecosystem based on the data below. You should be knowledgeable about:
- NOS token economics and market performance
- Nosana's role as a decentralized GPU compute provider for AI workloads
- The relationship between NOS staking and GPU provisioning
- Nosana's AI inference capabilities and supported models (Qwen, Llama, etc.)
- How Nosana compares to centralized GPU providers (cheaper, censorship-resistant, community-driven)
- The Nosana Builders Challenge and developer community

Structure your response as:
**Nosana Ecosystem Report**

**NOS Token:** Price, market cap, recent performance

**Network Overview:** What Nosana does, current network stats, supported GPU types

**Use Cases:** AI inference, agent hosting, model serving, deployments

**Ecosystem Strengths:** Key advantages of decentralized GPU compute

**Considerations:** Risks or things to watch

**Sources:** CoinGecko, Nosana Network

Data:
${nosanaData}

User question: ${userMsg}`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });

      if (callback) {
        await callback({ text: response, action: "NOSANA_ECOSYSTEM" });
      }
      return { text: response, success: true };
    } catch (err) {
      const errorMsg = "I encountered an issue gathering Nosana ecosystem data. Some sources may be temporarily unavailable.";
      if (callback) {
        await callback({ text: errorMsg, action: "NOSANA_ECOSYSTEM" });
      }
      return { text: errorMsg, success: false, error: String(err) };
    }
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "Tell me about Nosana" } },
      { name: "{{agentName}}", content: { text: "Let me pull the latest NOS token data and network info...", action: "NOSANA_ECOSYSTEM" } },
    ],
    [
      { name: "{{user1}}", content: { text: "What's the NOS price?" } },
      { name: "{{agentName}}", content: { text: "Checking NOS token metrics now...", action: "NOSANA_ECOSYSTEM" } },
    ],
    [
      { name: "{{user1}}", content: { text: "How does Nosana GPU compute work?" } },
      { name: "{{agentName}}", content: { text: "Pulling Nosana network data and ecosystem overview...", action: "NOSANA_ECOSYSTEM" } },
    ],
  ],
};
