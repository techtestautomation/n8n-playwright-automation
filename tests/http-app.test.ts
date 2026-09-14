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
