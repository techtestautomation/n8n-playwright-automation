import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { chromium } from "playwright";

import { PlaywrightNavigateActionExecutor } from "../src/infrastructure/playwright-navigate-action-executor.js";

test("executes a navigate action", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/html",
    });

    response.end(`
      <!doctype html>
      <html>
        <head>
          <title>Navigate Test</title>
        </head>
        <body>
          <h1>Navigate Test Page</h1>
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

  try {
    const page = await browser.newPage();

    const executor = new PlaywrightNavigateActionExecutor(page);

    const port = address.port;
    const url = `http://127.0.0.1:${port}`;

    const result = await executor.execute(
      {
        action: "navigate",
        url,
      },
      {
        stepIndex: 3,
      },
    );

    assert.equal(result.index, 3);
    assert.equal(result.action, "navigate");
    assert.equal(result.status, "passed");
    assert.ok(result.durationMs >= 0);

    assert.equal(result.data?.title, "Navigate Test");

    assert.equal(result.data?.finalUrl, `${url}/`);
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

    const executor = new PlaywrightNavigateActionExecutor(page);

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
