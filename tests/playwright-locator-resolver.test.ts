import assert from "node:assert/strict";
import test from "node:test";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "login.submitButton") {
      return "button[type='submit']";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

test("returns a direct locator", () => {
  const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

  const locator = resolver.resolve({
    locator: "#submit",
  });

  assert.equal(locator, "#submit");
});

test("resolves a locator reference", () => {
  const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

  const locator = resolver.resolve({
    locatorRef: "login.submitButton",
  });

  assert.equal(locator, "button[type='submit']");
});

test("rejects a missing locator", () => {
  const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

  assert.throws(() => resolver.resolve({}), /Locator is missing/);
});

test("propagates an unknown locator reference", () => {
  const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

  assert.throws(
    () =>
      resolver.resolve({
        locatorRef: "login.unknown",
      }),
    /Unknown locator reference: login\.unknown/,
  );
});
