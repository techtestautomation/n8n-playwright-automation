import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightFillActionExecutor } from "../src/infrastructure/playwright-fill-action-executor.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "test.nameInput") {
      return "#name";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

test("fills an input using a direct locator", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <input id="name" />
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightFillActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "fill",
        locator: "#name",
        value: "Raj",
      },
      {
        stepIndex: 4,
      },
    );

    assert.equal(result.index, 4);
    assert.equal(result.action, "fill");
    assert.equal(result.status, "passed");

    assert.equal(await page.locator("#name").inputValue(), "Raj");
  } finally {
    await browser.close();
  }
});

test("fills an input using a locator reference", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <input id="name" />
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightFillActionExecutor(page, resolver);

    await executor.execute(
      {
        action: "fill",
        locatorRef: "test.nameInput",
        value: "Raj",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(await page.locator("#name").inputValue(), "Raj");
  } finally {
    await browser.close();
  }
});

test("allows an empty fill value", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <input id="name" value="Existing" />
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightFillActionExecutor(page, resolver);

    await executor.execute(
      {
        action: "fill",
        locator: "#name",
        value: "",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(await page.locator("#name").inputValue(), "");
  } finally {
    await browser.close();
  }
});

test("rejects unsupported actions", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightFillActionExecutor(page, resolver);

    await assert.rejects(
      executor.execute(
        {
          action: "screenshot",
        },
        {
          stepIndex: 0,
        },
      ),
      /does not support action "screenshot"/,
    );
  } finally {
    await browser.close();
  }
});
