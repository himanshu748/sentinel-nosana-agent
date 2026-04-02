import { describe, it, expect, vi } from "vitest";
import { marketBriefingAction } from "../actions/marketBriefing.js";
import { tokenAnalysisAction } from "../actions/tokenAnalysis.js";
import { newsDigestAction } from "../actions/newsDigest.js";
import { researchTopicAction } from "../actions/researchTopic.js";
import { nosanaEcosystemAction } from "../actions/nosanaEcosystem.js";
import type { IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";

function mockRuntime(): IAgentRuntime {
  return {
    useModel: vi.fn().mockResolvedValue("Mocked AI response for testing"),
  } as unknown as IAgentRuntime;
}

function mockMessage(text: string): Memory {
  return {
    content: { text },
    entityId: "test-entity",
    roomId: "test-room",
    agentId: "test-agent",
  } as unknown as Memory;
}

describe("MARKET_BRIEFING action", () => {
  it("has correct metadata", () => {
    expect(marketBriefingAction.name).toBe("MARKET_BRIEFING");
    expect(marketBriefingAction.description).toBeTruthy();
    expect(marketBriefingAction.similes!.length).toBeGreaterThan(0);
    expect(marketBriefingAction.examples!.length).toBeGreaterThan(0);
  });

  it("validate always returns true", async () => {
    const result = await marketBriefingAction.validate(mockRuntime(), mockMessage("test"));
    expect(result).toBe(true);
  });

  it("handler calls callback with response", async () => {
    const runtime = mockRuntime();
    const cb = vi.fn();
    const result = await marketBriefingAction.handler(
      runtime,
      mockMessage("Give me a market briefing"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toHaveProperty("text");
    expect(cb.mock.calls[0][0]).toHaveProperty("action", "MARKET_BRIEFING");
    expect(result).toHaveProperty("success");
  });

  it("handler returns error gracefully on failure", async () => {
    const runtime = {
      useModel: vi.fn().mockRejectedValue(new Error("API down")),
    } as unknown as IAgentRuntime;
    const cb = vi.fn();
    const result = await marketBriefingAction.handler(
      runtime,
      mockMessage("briefing"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect((result as any).success).toBe(false);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("TOKEN_ANALYSIS action", () => {
  it("has correct metadata", () => {
    expect(tokenAnalysisAction.name).toBe("TOKEN_ANALYSIS");
    expect(tokenAnalysisAction.similes!.length).toBeGreaterThan(0);
  });

  it("validate always returns true", async () => {
    const result = await tokenAnalysisAction.validate(mockRuntime(), mockMessage("Analyze BTC"));
    expect(result).toBe(true);
  });

  it("handler calls callback", async () => {
    const runtime = mockRuntime();
    const cb = vi.fn();
    await tokenAnalysisAction.handler(
      runtime,
      mockMessage("Analyze SOL for me"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].action).toBe("TOKEN_ANALYSIS");
  });

  it("handler handles errors gracefully", async () => {
    const runtime = {
      useModel: vi.fn().mockRejectedValue(new Error("timeout")),
    } as unknown as IAgentRuntime;
    const cb = vi.fn();
    const result = await tokenAnalysisAction.handler(
      runtime,
      mockMessage("analyze ETH"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect((result as any).success).toBe(false);
  });
});

describe("NEWS_DIGEST action", () => {
  it("has correct metadata", () => {
    expect(newsDigestAction.name).toBe("NEWS_DIGEST");
    expect(newsDigestAction.similes!.length).toBeGreaterThan(0);
  });

  it("handler calls callback", async () => {
    const runtime = mockRuntime();
    const cb = vi.fn();
    await newsDigestAction.handler(
      runtime,
      mockMessage("latest crypto news"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].action).toBe("NEWS_DIGEST");
  });
});

describe("RESEARCH_TOPIC action", () => {
  it("has correct metadata", () => {
    expect(researchTopicAction.name).toBe("RESEARCH_TOPIC");
    expect(researchTopicAction.similes!.length).toBeGreaterThan(0);
  });

  it("handler calls callback", async () => {
    const runtime = mockRuntime();
    const cb = vi.fn();
    await researchTopicAction.handler(
      runtime,
      mockMessage("Research Solana DeFi"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].action).toBe("RESEARCH_TOPIC");
  });
});

describe("NOSANA_ECOSYSTEM action", () => {
  it("has correct metadata", () => {
    expect(nosanaEcosystemAction.name).toBe("NOSANA_ECOSYSTEM");
    expect(nosanaEcosystemAction.similes!).toContain("NOS_PRICE");
  });

  it("handler calls callback", async () => {
    const runtime = mockRuntime();
    const cb = vi.fn();
    await nosanaEcosystemAction.handler(
      runtime,
      mockMessage("Tell me about Nosana"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].action).toBe("NOSANA_ECOSYSTEM");
  });

  it("handler handles errors gracefully", async () => {
    const runtime = {
      useModel: vi.fn().mockRejectedValue(new Error("fail")),
    } as unknown as IAgentRuntime;
    const cb = vi.fn();
    const result = await nosanaEcosystemAction.handler(
      runtime,
      mockMessage("NOS price"),
      {} as State,
      {},
      cb as HandlerCallback
    );
    expect((result as any).success).toBe(false);
  });
});
