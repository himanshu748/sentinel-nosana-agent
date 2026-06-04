import { describe, expect, it } from "vitest";
import {
  deploymentErrorSummary,
  deploymentResponseSummary,
} from "../../scripts/deploy-errors.mjs";

describe("deployment error summaries", () => {
  it("does not expose raw deployment exception text", () => {
    const error = new Error("provider failed with sk-live-secret-token and /private/local/path");

    const summary = deploymentErrorSummary(error);

    expect(summary).toBe("Error; details sanitized");
    expect(summary).not.toContain("sk-live-secret-token");
    expect(summary).not.toContain("/private/local/path");
  });

  it("does not expose raw response bodies", async () => {
    const body = "provider failed with sk-live-secret-token and /private/local/path";
    const response = {
      status: 500,
      text: async () => body,
    };

    const summary = await deploymentResponseSummary(response);

    expect(summary).toBe(`HTTP 500 server_error; response body omitted (${body.length} bytes)`);
    expect(summary).not.toContain("sk-live-secret-token");
    expect(summary).not.toContain("/private/local/path");
  });
});
