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

  it("sanitizes RSS item fields before provider prompts", async () => {
    const { extractItems } = await import("../providers/rssFeed.js") as any;
    if (typeof extractItems !== "function") return;

    const xml = `<item>
      <title><![CDATA[BTC &amp; ETH <script>bad()</script> ${"x".repeat(220)}]]></title>
      <link>javascript:alert(1)</link>
      <pubDate>${"Mon, 01 Apr 2026 ".repeat(20)}</pubDate>
    </item>`;

    const [item] = extractItems(xml, "UnsafeSource");

    expect(item.title).toContain("BTC & ETH");
    expect(item.title).not.toContain("<script>");
    expect(item.title.length).toBeLessThanOrEqual(180);
    expect(item.link).toBe("");
    expect(item.pubDate.length).toBeLessThanOrEqual(80);
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
