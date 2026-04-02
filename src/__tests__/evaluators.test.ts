import { describe, it, expect } from "vitest";
import { freshnessEvaluator } from "../evaluators/freshness.js";
import { sourceQualityEvaluator } from "../evaluators/sourceQuality.js";
import type { IAgentRuntime, Memory } from "@elizaos/core";

const runtime = {} as IAgentRuntime;

function msg(text: string): Memory {
  return {
    content: { text },
    entityId: "test",
    roomId: "test",
    agentId: "test",
  } as unknown as Memory;
}

describe("FRESHNESS_CHECK evaluator", () => {
  it("has correct name and metadata", () => {
    expect(freshnessEvaluator.name).toBe("FRESHNESS_CHECK");
    expect(freshnessEvaluator.alwaysRun).toBe(true);
  });

  it("validates messages containing data source tags", async () => {
    expect(await freshnessEvaluator.validate(runtime, msg("[CoinGecko data here"))).toBe(true);
    expect(await freshnessEvaluator.validate(runtime, msg("[DeFiLlama TVL data"))).toBe(true);
    expect(await freshnessEvaluator.validate(runtime, msg("[Solana on-chain"))).toBe(true);
    expect(await freshnessEvaluator.validate(runtime, msg("[Crypto News feeds"))).toBe(true);
  });

  it("rejects messages without data source tags", async () => {
    expect(await freshnessEvaluator.validate(runtime, msg("Hello world"))).toBe(false);
    expect(await freshnessEvaluator.validate(runtime, msg("How are you?"))).toBe(false);
  });

  it("reports fresh data as success", async () => {
    const now = new Date().toISOString();
    const result = await freshnessEvaluator.handler(runtime, msg(`[CoinGecko] Fetched: ${now}`));
    expect((result as any).success).toBe(true);
    expect((result as any).text).toContain("fresh");
  });

  it("flags stale data", async () => {
    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const result = await freshnessEvaluator.handler(runtime, msg(`Data timestamp: ${old}`));
    expect((result as any).success).toBe(false);
    expect((result as any).text).toContain("stale");
  });

  it("handles messages with no timestamps", async () => {
    const result = await freshnessEvaluator.handler(runtime, msg("No timestamps here"));
    expect((result as any).success).toBe(true);
  });
});

describe("SOURCE_QUALITY evaluator", () => {
  it("has correct name and metadata", () => {
    expect(sourceQualityEvaluator.name).toBe("SOURCE_QUALITY");
    expect(sourceQualityEvaluator.alwaysRun).toBe(true);
  });

  it("validates messages containing data source tags", async () => {
    expect(await sourceQualityEvaluator.validate(runtime, msg("[CoinGecko data"))).toBe(true);
    expect(await sourceQualityEvaluator.validate(runtime, msg("[DeFiLlama data"))).toBe(true);
  });

  it("rejects messages without source tags", async () => {
    expect(await sourceQualityEvaluator.validate(runtime, msg("no sources"))).toBe(false);
  });

  it("returns high confidence with multiple sources", async () => {
    const text = "[CoinGecko data here\n[DeFiLlama TVL\n[Solana On-Chain\n[Crypto News feeds";
    const result = await sourceQualityEvaluator.handler(runtime, msg(text));
    expect((result as any).success).toBe(true);
    expect((result as any).data.confidence).toBe(100);
    expect((result as any).data.activeSources.length).toBe(4);
  });

  it("returns low confidence with single source", async () => {
    const text = "[CoinGecko only one source";
    const result = await sourceQualityEvaluator.handler(runtime, msg(text));
    expect((result as any).success).toBe(false);
    expect((result as any).data.confidence).toBe(30);
    expect((result as any).data.activeSources.length).toBe(1);
  });

  it("returns partial confidence with two sources", async () => {
    const text = "[CoinGecko market\n[DeFiLlama TVL";
    const result = await sourceQualityEvaluator.handler(runtime, msg(text));
    expect((result as any).success).toBe(true);
    expect((result as any).data.confidence).toBe(60);
  });
});
