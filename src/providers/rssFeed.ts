import type { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const RSS_FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "CoinTelegraph", url: "https://cointelegraph.com/rss" },
  { name: "The Block", url: "https://www.theblock.co/rss.xml" },
];

function extractItems(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";

    if (title) {
      items.push({ title, link, pubDate, source });
    }
  }
  return items;
}

async function fetchFeed(name: string, url: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return extractItems(xml, name).slice(0, 5);
  } catch {
    return [];
  }
}

async function getAllNews(): Promise<FeedItem[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchFeed(f.name, f.url))
  );

  const allItems: FeedItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      allItems.push(...r.value);
    }
  }

  return allItems
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 15);
}

export const rssFeedProvider: Provider = {
  name: "rssFeed",
  description: "Aggregated crypto news from CoinDesk, CoinTelegraph, and The Block",
  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State
  ): Promise<ProviderResult> => {
    const news = await getAllNews();
    const parts: string[] = ["[Crypto News Feeds]"];
    const timestamp = new Date().toISOString();
    parts.push(`Fetched: ${timestamp}`);

    if (news.length > 0) {
      const sourceCounts = new Map<string, number>();
      parts.push(`\nLatest ${news.length} headlines:`);
      for (let i = 0; i < news.length; i++) {
        const item = news[i];
        const date = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString()
          : "unknown date";
        parts.push(`  ${i + 1}. [${item.source}] ${item.title} (${date})`);
        sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
      }
      parts.push(
        `\nSources reporting: ${[...sourceCounts.entries()].map(([k, v]) => `${k} (${v})`).join(", ")}`
      );
    } else {
      parts.push("\nNo news available (all feeds failed or rate-limited)");
    }

    return { text: parts.join("\n") };
  },
};

export { getAllNews, extractItems };
