import { describe, expect, it } from "vitest";
import {
  deploymentCreatedSummary,
  deploymentErrorSummary,
  deploymentResponseSummary,
  deploymentStatusSummary,
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

  it("summarizes deployment creation without echoing env details", () => {
    const deployment = {
      id: "dep_123",
      status: "created",
      endpoints: [{ url: "https://sentinel.example" }],
      job_definition: {
        ops: [
          {
            args: {
              env: {
                OPENAI_API_KEY: "sk-live-secret-token",
              },
            },
          },
        ],
      },
    };

    const summary = deploymentCreatedSummary(deployment);

    expect(summary).toBe("id=dep_123; status=created; endpoints=1; details sanitized");
    expect(summary).not.toContain("sk-live-secret-token");
    expect(summary).not.toContain("OPENAI_API_KEY");
  });

  it("summarizes deployment status with only status and endpoint", () => {
    const summary = deploymentStatusSummary({
      status: "running",
      endpoints: [{ url: "https://sentinel.example" }],
      logs: "provider failed with sk-live-secret-token",
    });

    expect(summary).toBe("status=running; endpoint=https://sentinel.example");
    expect(summary).not.toContain("sk-live-secret-token");
  });
});
