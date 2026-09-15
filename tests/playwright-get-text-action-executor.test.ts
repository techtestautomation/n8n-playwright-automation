import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightGetTextActionExecutor } from "../src/infrastructure/playwright-get-text-action-executor.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "test.result") {
      return "#result";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

test("gets text using a direct locator", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Hello Raj</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightGetTextActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "getText",
        locator: "#result",
      },
      {
        stepIndex: 2,
      },
    );

    assert.equal(result.index, 2);
    assert.equal(result.action, "getText");
    assert.equal(result.status, "passed");
    assert.equal(result.data?.text, "Hello Raj");
  } finally {
    await browser.close();
  }
});

test("gets text using a locator reference", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Reference Text</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightGetTextActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "getText",
        locatorRef: "test.result",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(result.data?.text, "Reference Text");
  } finally {
    await browser.close();
  }
});
