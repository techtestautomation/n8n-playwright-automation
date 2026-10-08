import { describe, expect, it } from "vitest";

import { getArtifactUrl } from "./workflow-api";

describe("getArtifactUrl", () => {
  it("creates an artifact URL from a relative artifact path", () => {
    expect(getArtifactUrl("artifacts/run-123-failed.png")).toBe(
      "http://localhost:3001/automation/artifacts/run-123-failed.png",
    );
  });

  it("creates an artifact URL for a Playwright trace", () => {
    expect(getArtifactUrl("artifacts/run-123-failed.zip")).toBe(
      "http://localhost:3001/automation/artifacts/run-123-failed.zip",
    );
  });

  it("URL-encodes the artifact filename", () => {
    expect(getArtifactUrl("artifacts/failure screenshot.png")).toBe(
      "http://localhost:3001/automation/artifacts/failure%20screenshot.png",
    );
  });

  it("rejects an artifact path without a filename", () => {
    expect(() => getArtifactUrl("")).toThrow("Invalid artifact path:");
  });
});
