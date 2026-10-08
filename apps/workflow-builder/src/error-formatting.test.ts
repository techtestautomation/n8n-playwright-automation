import { describe, expect, it } from "vitest";

import { formatAutomationError } from "./error-formatting";

describe("formatAutomationError", () => {
  it("removes ANSI escape sequences", () => {
    const message = "\u001b[2m  - waiting for locator('button')\u001b[22m";

    expect(formatAutomationError(message)).toBe(
      "- waiting for locator('button')",
    );
  });

  it("preserves multiline Playwright diagnostics", () => {
    const message =
      "locator.click: Timeout 30000ms exceeded.\n" +
      "Call log:\n" +
      "  - waiting for locator('button')";

    expect(formatAutomationError(message)).toBe(message);
  });

  it("trims surrounding whitespace", () => {
    expect(formatAutomationError("  Timeout exceeded  \n")).toBe(
      "Timeout exceeded",
    );
  });
});
