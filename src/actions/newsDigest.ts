import type { Action, IAgentRuntime, Memory, HandlerCallback, State } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getAllNews } from "../providers/rssFeed.js";
import { safeActionError } from "../utils/errors.js";

export const newsDigestAction: Action = {
  name: "NEWS_DIGEST",
  description:
    "Aggregate and summarize the latest cryptocurrency news from multiple RSS feeds (CoinDesk, CoinTelegraph, The Block).",
  similes: [
    "CRYPTO_NEWS",
    "LATEST_NEWS",
    "NEWS_SUMMARY",
    "WHATS_NEW",
    "NEWS_UPDATE",
    "HEADLINES",
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
      const news = await getAllNews();
      const userMsg = message.content.text ?? "";

      let newsData: string;
      if (news.length > 0) {
        const lines = news.map(
          (item, i) =>
            `${i + 1}. [${item.source}] ${item.title} (${item.pubDate ? new Date(item.pubDate).toLocaleDateString() : "recent"})`
        );
        newsData = lines.join("\n");
      } else {
        newsData = "No news headlines available at this time. RSS feeds may be rate-limited.";
      }

      const prompt = `You are Sentinel, a crypto research analyst. Create a news digest from the headlines below.

Structure your response as:
**Crypto News Digest**

**Top Stories:**
Summarize the 5 most important/impactful headlines. For each:
- One-line summary of what happened
- Why it matters (brief)

**Trends:** 1-2 sentences on recurring themes across the headlines.

**Sources:** List the news outlets that provided data.

Here are the latest crypto headlines:

${newsData}

User message: ${userMsg}`;

      const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });

      if (callback) {
        await callback({ text: response, action: "NEWS_DIGEST" });
      }
      return { text: response, success: true };
    } catch {
      const errorMsg = "I encountered an issue fetching news. RSS feeds may be temporarily unavailable.";
      if (callback) {
        await callback({ text: errorMsg, action: "NEWS_DIGEST" });
      }
      return { text: errorMsg, success: false, error: safeActionError() };
    }
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "What's the latest crypto news?" } },
      { name: "{{agentName}}", content: { text: "Pulling the latest headlines from crypto news feeds...", action: "NEWS_DIGEST" } },
    ],
    [
      { name: "{{user1}}", content: { text: "Give me a news digest" } },
      { name: "{{agentName}}", content: { text: "Aggregating news from multiple sources...", action: "NEWS_DIGEST" } },
    ],
  ],
};
