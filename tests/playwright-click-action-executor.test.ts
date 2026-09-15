import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { chromium } from "playwright";

import type { LocatorRegistry } from "../src/application/locator-registry.js";
import { PlaywrightClickActionExecutor } from "../src/infrastructure/playwright-click-action-executor.js";
import { PlaywrightLocatorResolver } from "../src/infrastructure/playwright-locator-resolver.js";

class FakeLocatorRegistry implements LocatorRegistry {
  resolve(reference: string): string {
    if (reference === "test.submitButton") {
      return "#submit";
    }

    throw new Error(`Unknown locator reference: ${reference}`);
  }
}

async function createTestPage() {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/html",
    });

    response.end(`
      <!doctype html>
      <html>
        <body>
          <button id="submit">Submit</button>
          <p id="result">Not clicked</p>

          <script>
            document
              .querySelector("#submit")
              .addEventListener("click", () => {
                document.querySelector("#result").textContent =
                  "Clicked";
              });
          </script>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto(`http://127.0.0.1:${address.port}`);

  return {
    server,
    browser,
    page,
  };
}

test("executes a click using a direct locator", async () => {
  const { server, browser, page } = await createTestPage();

  try {
    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightClickActionExecutor(page, resolver);

    const result = await executor.execute(
      {
        action: "click",
        locator: "#submit",
      },
      {
        stepIndex: 2,
      },
    );

    assert.equal(result.index, 2);
    assert.equal(result.action, "click");
    assert.equal(result.status, "passed");

    assert.equal(await page.locator("#result").textContent(), "Clicked");
  } finally {
    await browser.close();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test("executes a click using a locator reference", async () => {
  const { server, browser, page } = await createTestPage();

  try {
    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightClickActionExecutor(page, resolver);

    await executor.execute(
      {
        action: "click",
        locatorRef: "test.submitButton",
      },
      {
        stepIndex: 0,
      },
    );

    assert.equal(await page.locator("#result").textContent(), "Clicked");
  } finally {
    await browser.close();

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

test("rejects unsupported actions", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const resolver = new PlaywrightLocatorResolver(new FakeLocatorRegistry());

    const executor = new PlaywrightClickActionExecutor(page, resolver);

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
