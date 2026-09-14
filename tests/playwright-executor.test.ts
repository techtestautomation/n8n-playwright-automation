import { access } from "node:fs/promises";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { JsonLocatorRegistry } from "../src/infrastructure/json-locator-registry.js";
import { PlaywrightAutomationExecutor } from "../src/infrastructure/playwright-executor.js";

test("executes browser actions using central locator references", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "Content-Type": "text/html",
    });

    response.end(`
      <!doctype html>
      <html>
        <head>
          <title>Locator Registry Test</title>
        </head>
        <body>
          <input id="name" />

          <button
            id="submit"
            onclick="
              document.getElementById('result').textContent =
                'Hello ' + document.getElementById('name').value;

              document.getElementById('result').style.display = 'block';
            "
          >
            Submit
          </button>

          <div id="result" style="display: none"></div>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  assert.ok(address);

  if (typeof address === "string") {
    throw new Error("Expected TCP server address");
  }

  const url = `http://127.0.0.1:${address.port}`;

  try {
    const locatorRegistry = new JsonLocatorRegistry();

    const executor = new PlaywrightAutomationExecutor(locatorRegistry);

    const result = await executor.run({
      steps: [
        {
          action: "navigate",
          url,
        },
        {
          action: "fill",
          locatorRef: "test-page.nameInput",
          value: "Raj",
        },
        {
          action: "click",
          locatorRef: "test-page.submitButton",
        },
        {
          action: "waitFor",
          locatorRef: "test-page.result",
        },
        {
          action: "verifyText",
          locatorRef: "test-page.result",
          expected: "Hello Raj",
        },
        {
          action: "getText",
          locatorRef: "test-page.result",
        },
        {
          action: "screenshot",
        },
      ],
      captureTrace: false,
    });

    assert.equal(result.status, "passed");
    assert.ok(result.steps);
    assert.equal(result.steps.length, 7);

    const screenshotStep = result.steps.find(
      (step) => step.action === "screenshot",
    );

    assert.ok(screenshotStep);
    assert.ok(screenshotStep.artifact);

    await access(screenshotStep.artifact);

    const getTextStep = result.steps.find((step) => step.action === "getText");

    assert.ok(getTextStep);

    assert.deepEqual(getTextStep.data, {
      text: "Hello Raj",
    });

    const verifyStep = result.steps.find(
      (step) => step.action === "verifyText",
    );

    assert.ok(verifyStep);

    assert.deepEqual(verifyStep.data, {
      expected: "Hello Raj",
      actual: "Hello Raj",
    });
  } finally {
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

test("verifyText reports expected and actual text on failure", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "text/html",
    });

    response.end(`
      <!doctype html>
      <html>
        <body>
          <h1 id="heading">Actual Heading</h1>
        </body>
      </html>
    `);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    assert.ok(address);

    if (typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const registry = new JsonLocatorRegistry();
    const executor = new PlaywrightAutomationExecutor(registry);

    const result = await executor.run({
      steps: [
        {
          action: "navigate",
          url: `http://127.0.0.1:${address.port}`,
        },
        {
          action: "verifyText",
          locator: "#heading",
          expected: "Expected Heading",
        },
      ],
    });

    assert.equal(result.status, "failed");

    assert.match(
      result.error?.message ?? "",
      /Expected "Expected Heading".*received "Actual Heading"/i,
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
});
