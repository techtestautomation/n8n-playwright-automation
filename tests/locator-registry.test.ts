import assert from "node:assert/strict";
import test from "node:test";

import { JsonLocatorRegistry } from "../src/infrastructure/json-locator-registry.js";

test("resolves locator by page and name", () => {
  const registry = new JsonLocatorRegistry();

  assert.equal(registry.resolve("login.submitButton"), "button[type='submit']");
});

test("throws for unknown locator reference", () => {
  const registry = new JsonLocatorRegistry();

  assert.throws(
    () => registry.resolve("login.doesNotExist"),
    /Unknown locator reference/,
  );
});
