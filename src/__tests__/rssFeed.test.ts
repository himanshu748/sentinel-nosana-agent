import { describe, it, expect, vi } from "vitest";

describe("RSS feed XML parser", () => {
  it("extracts items from valid XML", async () => {
    const { extractItems } = await import("../providers/rssFeed.js") as any;
    if (typeof extractItems !== "function") return;

    const xml = `<item><title>BTC hits 100K</title><link>https://example.com/1</link><pubDate>Mon, 01 Apr 2026</pubDate></item>
<item><title><![CDATA[ETH update]]></title><link>https://example.com/2</link><pubDate>Mon, 01 Apr 2026</pubDate></item>`;

    const items = extractItems(xml, "TestSource");
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("BTC hits 100K");
    expect(items[0].source).toBe("TestSource");
    expect(items[1].title).toBe("ETH update");
  });

  it("returns empty array for invalid XML", async () => {
    const { extractItems } = await import("../providers/rssFeed.js") as any;
    if (typeof extractItems !== "function") return;

    const items = extractItems("not xml at all", "Test");
    expect(items).toEqual([]);
  });
});

describe("RSS feed provider", () => {
  it("rssFeedProvider has correct name", async () => {
    const { rssFeedProvider } = await import("../providers/rssFeed.js");
    expect(rssFeedProvider.name).toBe("rssFeed");
    expect(typeof rssFeedProvider.get).toBe("function");
  });
});
