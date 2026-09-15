import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";
import { PlaywrightVerifyTextActionExecutor } from "../src/infrastructure/playwright-verify-text-action-executor.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "test.result") {
      return "#result";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

test("verifies text using a direct locator", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Hello Raj</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightVerifyTextActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "verifyText",
        locator: "#result",
        expected: "Hello Raj",
      },
      {
        stepIndex: 5,
      },
    );

    assert.equal(result.index, 5);
    assert.equal(result.action, "verifyText");
    assert.equal(result.status, "passed");

    assert.equal(result.data?.expected, "Hello Raj");

    assert.equal(result.data?.actual, "Hello Raj");
  } finally {
    await browser.close();
  }
});

test("verifies text using a locator reference", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Expected Text</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightVerifyTextActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "verifyText",
        locatorRef: "test.result",
        expected: "Expected Text",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(result.data?.actual, "Expected Text");
  } finally {
    await browser.close();
  }
});

test("fails when text does not match", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Actual Text</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightVerifyTextActionExecutor(page, resolver);

    await assert.rejects(
      executor.execute(
        {
          action: "verifyText",
          locatorRef: "test.result",
          expected: "Expected Text",
        },
        {
          stepIndex: 0,
        },
      ),
      /Expected "Expected Text", but received "Actual Text"/,
    );
  } finally {
    await browser.close();
  }
});
