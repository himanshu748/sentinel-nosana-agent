import type { Provider, IAgentRuntime, Memory, State, ProviderResult } from "@elizaos/core";
import { cached } from "../utils/cache.js";

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

const RSS_CACHE_TTL = 180_000; // 3 min
const MAX_TITLE_CHARS = 180;
const MAX_DATE_CHARS = 80;

function extractItems(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = sanitizeText(
      block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1] ?? "",
      MAX_TITLE_CHARS
    );
    const link = sanitizeHttpUrl(block.match(/<link>(.*?)<\/link>/)?.[1] ?? "");
    const pubDate = sanitizeText(
      block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "",
      MAX_DATE_CHARS
    );

    if (title) {
      items.push({ title, link, pubDate, source });
    }
  }
  return items;
}

function sanitizeText(value: string, maxChars: number): string {
  return decodeXmlEntities(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function sanitizeHttpUrl(value: string): string {
  const trimmed = decodeXmlEntities(value).trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
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
  return cached("rss:all", RSS_CACHE_TTL, async () => {
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
  });
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
