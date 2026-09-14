import assert from "node:assert/strict";
import test from "node:test";

import type { AutomationExecutor } from "../src/application/automation-executor.js";
import { ScriptParser } from "../src/application/script-parser.js";
import { buildApp } from "../src/interfaces/http/app.js";

test("runs a human-friendly automation script", async () => {
  const executor: AutomationExecutor = {
    async run(request) {
      assert.deepEqual(request, {
        steps: [
          {
            action: "navigate",
            url: "https://example.com",
          },
          {
            action: "verifyText",
            locatorRef: "common.pageHeading",
            expected: "Example Domain",
          },
          {
            action: "screenshot",
          },
        ],
        captureTrace: true,
      });

      return {
        status: "passed",
        startedAt: new Date().toISOString(),
        durationMs: 1,
        steps: [],
        artifacts: {},
      };
    },
  };

  const app = buildApp(executor, new ScriptParser());

  const response = await app.inject({
    method: "POST",
    url: "/automation/run-script",
    payload: {
      script: `
        OPEN https://example.com
        VERIFY TEXT common.pageHeading = Example Domain
        SCREENSHOT
      `,
    },
  });

  assert.equal(response.statusCode, 200);
});

test("rejects run-script without a script string", async () => {
  const executor: AutomationExecutor = {
    async run() {
      throw new Error("executor should not be called");
    },
  };

  const app = buildApp(executor, new ScriptParser());

  const response = await app.inject({
    method: "POST",
    url: "/automation/run-script",
    payload: {},
  });

  assert.equal(response.statusCode, 400);

  const body = response.json();

  assert.equal(body.status, "failed");
  assert.match(body.error.message, /script must be a string/i);
});

test("returns structured failure diagnostics for script execution", async () => {
  const fakeExecutor: AutomationExecutor = {
    async run() {
      return {
        status: "failed",
        startedAt: "2026-09-14T19:00:00.000Z",
        durationMs: 125,
        failedStep: {
          index: 4,
          action: "verifyText",
          durationMs: 8,
          locatorRef: "test-page.result",
          error: {
            name: "Error",
            message:
              'Text verification failed. Expected "Hello Raj", but received "Hello Ravi"',
          },
        },
        artifacts: {
          screenshot: "/app/artifacts/run-failed.png",
          trace: "/app/artifacts/run-failed.zip",
        },
        error: {
          name: "Error",
          message:
            'Text verification failed. Expected "Hello Raj", but received "Hello Ravi"',
        },
      };
    },
  };

  const app = buildApp(fakeExecutor, new ScriptParser());

  const response = await app.inject({
    method: "POST",
    url: "/automation/run-script",
    payload: {
      script: `
OPEN http://demo-app:3000
TYPE test-page.nameInput = Raj
CLICK test-page.submitButton
WAIT test-page.result
VERIFY TEXT test-page.result = Hello Ravi
`,
    },
  });

  assert.equal(response.statusCode, 502);

  const body = response.json();

  assert.equal(body.status, "failed");

  assert.equal(body.failedStep.index, 4);
  assert.equal(body.failedStep.action, "verifyText");
  assert.equal(body.failedStep.locatorRef, "test-page.result");

  assert.equal(body.artifacts.screenshot, "/app/artifacts/run-failed.png");

  assert.equal(body.artifacts.trace, "/app/artifacts/run-failed.zip");

  assert.match(
    body.error.message,
    /Expected "Hello Raj".*received "Hello Ravi"/i,
  );

  await app.close();
});

test("returns structured failure diagnostics for JSON execution", async () => {
  const fakeExecutor: AutomationExecutor = {
    async run() {
      return {
        status: "failed",
        startedAt: "2026-09-14T19:00:00.000Z",
        durationMs: 125,
        failedStep: {
          index: 0,
          action: "verifyText",
          durationMs: 8,
          locatorRef: "test-page.result",
          error: {
            name: "Error",
            message:
              'Text verification failed. Expected "Hello Raj", but received "Hello Ravi"',
          },
        },
        artifacts: {
          screenshot: "/app/artifacts/run-failed.png",
          trace: "/app/artifacts/run-failed.zip",
        },
        error: {
          name: "Error",
          message:
            'Text verification failed. Expected "Hello Raj", but received "Hello Ravi"',
        },
      };
    },
  };

  const app = buildApp(fakeExecutor, new ScriptParser());

  const response = await app.inject({
    method: "POST",
    url: "/automation/run",
    payload: {
      steps: [
        {
          action: "verifyText",
          locatorRef: "test-page.result",
          expected: "Hello Raj",
        },
      ],
      captureTrace: true,
    },
  });

  assert.equal(response.statusCode, 502);

  const body = response.json();

  assert.equal(body.status, "failed");

  assert.equal(body.failedStep.index, 0);
  assert.equal(body.failedStep.action, "verifyText");
  assert.equal(body.failedStep.locatorRef, "test-page.result");

  assert.equal(body.artifacts.screenshot, "/app/artifacts/run-failed.png");

  assert.equal(body.artifacts.trace, "/app/artifacts/run-failed.zip");

  assert.match(
    body.error.message,
    /Expected "Hello Raj".*received "Hello Ravi"/i,
  );

  await app.close();
});
