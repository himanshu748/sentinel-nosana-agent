import { describe, it, expect } from "vitest";
import project from "../index.js";

describe("Sentinel plugin structure", () => {
  it("exports a valid Project with agents array", () => {
    expect(project).toBeDefined();
    expect(project.agents).toBeDefined();
    expect(Array.isArray(project.agents)).toBe(true);
    expect(project.agents.length).toBe(1);
  });

  it("agent has a character with correct name", () => {
    const agent = project.agents[0];
    expect(agent.character).toBeDefined();
    expect(agent.character.name).toBe("Sentinel");
  });

  it("agent has plugins array with sentinel plugin", () => {
    const agent = project.agents[0];
    expect(agent.plugins).toBeDefined();
    expect(agent.plugins!.length).toBe(1);
    expect(agent.plugins![0].name).toBe("plugin-sentinel");
  });

  it("plugin has all 5 actions", () => {
    const plugin = project.agents[0].plugins![0];
    expect(plugin.actions).toBeDefined();
    expect(plugin.actions!.length).toBe(5);

    const names = plugin.actions!.map((a) => a.name);
    expect(names).toContain("MARKET_BRIEFING");
    expect(names).toContain("TOKEN_ANALYSIS");
    expect(names).toContain("NEWS_DIGEST");
    expect(names).toContain("RESEARCH_TOPIC");
    expect(names).toContain("NOSANA_ECOSYSTEM");
  });

  it("plugin has all 4 providers", () => {
    const plugin = project.agents[0].plugins![0];
    expect(plugin.providers).toBeDefined();
    expect(plugin.providers!.length).toBe(4);

    const names = plugin.providers!.map((p) => p.name);
    expect(names).toContain("coingecko");
    expect(names).toContain("defillama");
    expect(names).toContain("rssFeed");
    expect(names).toContain("solanaOnChain");
  });

  it("plugin has 2 evaluators", () => {
    const plugin = project.agents[0].plugins![0];
    expect(plugin.evaluators).toBeDefined();
    expect(plugin.evaluators!.length).toBe(2);

    const names = plugin.evaluators!.map((e) => e.name);
    expect(names).toContain("FRESHNESS_CHECK");
    expect(names).toContain("SOURCE_QUALITY");
  });

  it("all actions have required handler and validate", () => {
    const plugin = project.agents[0].plugins![0];
    for (const action of plugin.actions!) {
      expect(typeof action.handler).toBe("function");
      expect(typeof action.validate).toBe("function");
      expect(typeof action.name).toBe("string");
      expect(typeof action.description).toBe("string");
    }
  });

  it("all providers have required name and get function", () => {
    const plugin = project.agents[0].plugins![0];
    for (const provider of plugin.providers!) {
      expect(typeof provider.get).toBe("function");
      expect(typeof provider.name).toBe("string");
    }
  });

  it("all evaluators have required handler, validate, and examples", () => {
    const plugin = project.agents[0].plugins![0];
    for (const evaluator of plugin.evaluators!) {
      expect(typeof evaluator.handler).toBe("function");
      expect(typeof evaluator.validate).toBe("function");
      expect(Array.isArray(evaluator.examples)).toBe(true);
    }
  });
});

describe("Character configuration", () => {
  const character = project.agents[0].character;

  it("has required fields", () => {
    expect(character.name).toBe("Sentinel");
    expect(character.username).toBe("sentinel");
    expect(typeof character.system).toBe("string");
    expect(character.system!.length).toBeGreaterThan(50);
  });

  it("has bio array", () => {
    expect(Array.isArray(character.bio)).toBe(true);
    expect((character.bio as string[]).length).toBeGreaterThan(0);
  });

  it("has message examples", () => {
    expect(Array.isArray(character.messageExamples)).toBe(true);
    expect(character.messageExamples!.length).toBeGreaterThan(0);
  });

  it("has topics", () => {
    expect(Array.isArray(character.topics)).toBe(true);
    expect(character.topics!).toContain("cryptocurrency");
    expect(character.topics!).toContain("DeFi");
  });

  it("has style guides", () => {
    expect(character.style).toBeDefined();
    expect(Array.isArray(character.style!.all)).toBe(true);
    expect(Array.isArray(character.style!.chat)).toBe(true);
  });

  it("references correct plugins", () => {
    expect(Array.isArray(character.plugins)).toBe(true);
    expect(character.plugins).toContain("@elizaos/plugin-bootstrap");
    expect(character.plugins).toContain("@elizaos/plugin-openai");
  });
});
