import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { access } from 'node:fs/promises';

import { JsonLocatorRegistry } from '../src/infrastructure/json-locator-registry.js';
import { PlaywrightAutomationExecutor } from '../src/infrastructure/playwright-executor.js';

test('executes browser actions using central locator references', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, {
      'Content-Type': 'text/html',
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
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();

  assert.ok(address);

  if (typeof address === 'string') {
    throw new Error('Expected TCP server address');
  }

  const url = `http://127.0.0.1:${address.port}`;

  try {
    const locatorRegistry = new JsonLocatorRegistry();

    const executor = new PlaywrightAutomationExecutor(
      locatorRegistry,
    );

    const result = await executor.run({
      steps: [
        {
          action: 'navigate',
          url,
        },
        {
          action: 'fill',
          locatorRef: 'test-page.nameInput',
          value: 'Raj',
        },
        {
          action: 'click',
          locatorRef: 'test-page.submitButton',
        },
        {
          action: 'waitFor',
          locatorRef: 'test-page.result',
        },
        {
          action: 'getText',
          locatorRef: 'test-page.result',
        },
        {
          action: 'screenshot',
        },
      ],
      captureTrace: false,
    });

    assert.equal(result.status, 'passed');
    assert.ok(result.steps);
    assert.equal(result.steps.length, 6);

    const getTextResult = result.steps[4];

    const screenshotResult = result.steps[5];

    assert.ok(screenshotResult);
    assert.equal(screenshotResult.action, 'screenshot');
    assert.ok(screenshotResult.artifact);

    assert.ok(screenshotResult.artifact);

    await access(screenshotResult.artifact);

    assert.ok(getTextResult);
    assert.equal(getTextResult.action, 'getText');
    assert.deepEqual(getTextResult.data, {
      text: 'Hello Raj',
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