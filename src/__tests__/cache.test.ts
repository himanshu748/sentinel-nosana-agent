import { describe, it, expect, beforeEach } from "vitest";
import { cached, clearCache } from "../utils/cache.js";

describe("Cache utility", () => {
  beforeEach(() => {
    clearCache();
  });

  it("should cache results and return same value on second call", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return "result";
    };

    const first = await cached("key1", 5000, fn);
    const second = await cached("key1", 5000, fn);

    expect(first).toBe("result");
    expect(second).toBe("result");
    expect(callCount).toBe(1);
  });

  it("should expire after TTL", async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return callCount;
    };

    await cached("key2", 1, fn);
    await new Promise((r) => setTimeout(r, 10));
    const second = await cached("key2", 1, fn);

    expect(second).toBe(2);
    expect(callCount).toBe(2);
  });

  it("should cache different keys independently", async () => {
    const result1 = await cached("a", 5000, async () => "alpha");
    const result2 = await cached("b", 5000, async () => "beta");

    expect(result1).toBe("alpha");
    expect(result2).toBe("beta");
  });

  it("should clear all entries on clearCache()", async () => {
    let callCount = 0;
    const fn = async () => ++callCount;

    await cached("x", 60000, fn);
    clearCache();
    await cached("x", 60000, fn);

    expect(callCount).toBe(2);
  });
});
