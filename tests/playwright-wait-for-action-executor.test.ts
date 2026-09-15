import assert from "node:assert/strict";
import test from "node:test";

import { chromium } from "playwright";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";
import { PlaywrightWaitForActionExecutor } from "../src/infrastructure/playwright-wait-for-action-executor.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "test.result") {
      return "#result";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

test("waits for an element using a direct locator", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <div id="container"></div>

      <script>
        setTimeout(() => {
          const result =
            document.createElement("p");

          result.id = "result";
          result.textContent = "Ready";

          document
            .querySelector("#container")
            .appendChild(result);
        }, 50);
      </script>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightWaitForActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "waitFor",
        locator: "#result",
      },
      {
        stepIndex: 3,
      },
    );

    assert.equal(result.index, 3);
    assert.equal(result.action, "waitFor");
    assert.equal(result.status, "passed");

    assert.equal(await page.locator("#result").textContent(), "Ready");
  } finally {
    await browser.close();
  }
});

test("waits using a locator reference", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <p id="result">Ready</p>
    `);

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightWaitForActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "waitFor",
        locatorRef: "test.result",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(result.status, "passed");
  } finally {
    await browser.close();
  }
});
