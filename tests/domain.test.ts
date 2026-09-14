import assert from "node:assert/strict";
import test from "node:test";

import { validateAutomationRequest } from "../src/domain/automation.js";

test("validates and normalizes a navigate step", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  assert.deepEqual(result, {
    steps: [
      {
        action: "navigate",
        url: "https://example.com/",
      },
    ],
    captureTrace: false,
    retries: 0,
  });
});

test("validates a multi-step automation request", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
      {
        action: "getText",
        locator: "h1",
      },
      {
        action: "screenshot",
      },
    ],
    captureTrace: true,
  });

  assert.equal(result.steps.length, 3);
  assert.equal(result.captureTrace, true);
});

test("validates locatorRef", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "click",
        locatorRef: "login.submitButton",
      },
    ],
  });

  assert.deepEqual(result.steps[0], {
    action: "click",
    locatorRef: "login.submitButton",
  });
});

test("validates raw locator", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "click",
        locator: "#submit",
      },
    ],
  });

  assert.deepEqual(result.steps[0], {
    action: "click",
    locator: "#submit",
  });
});

test("validates fill action with locatorRef", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "fill",
        locatorRef: "login.usernameInput",
        value: "raj",
      },
    ],
  });

  assert.deepEqual(result.steps[0], {
    action: "fill",
    locatorRef: "login.usernameInput",
    value: "raj",
  });
});

test("allows empty string as fill value", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "fill",
        locator: "#username",
        value: "",
      },
    ],
  });

  const step = result.steps[0];

  assert.ok(step);
  assert.equal(step.action, "fill");

  if (step.action === "fill") {
    assert.equal(step.value, "");
  }
});

test("rejects empty steps", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [],
      }),
    /at least one action/i,
  );
});

test("rejects unsupported URL protocols", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "navigate",
            url: "file:///etc/passwd",
          },
        ],
      }),
    /http or https/i,
  );
});

test("rejects navigate step without url", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "navigate",
          },
        ],
      }),
    /url is required/i,
  );
});

test("rejects locator action without locator or locatorRef", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "click",
          },
        ],
      }),
    /exactly one of locator or locatorRef/i,
  );
});

test("rejects locator action with both locator and locatorRef", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "click",
            locator: "#submit",
            locatorRef: "login.submitButton",
          },
        ],
      }),
    /exactly one of locator or locatorRef/i,
  );
});

test("rejects fill action without value", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "fill",
            locatorRef: "login.usernameInput",
          },
        ],
      }),
    /value is required/i,
  );
});

test("rejects unsupported action", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "dance",
          },
        ],
      }),
    /not supported/i,
  );
});

test("validates verifyText action", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "verifyText",
        locatorRef: "common.pageHeading",
        expected: "Example Domain",
      },
    ],
  });

  assert.deepEqual(result.steps[0], {
    action: "verifyText",
    locatorRef: "common.pageHeading",
    expected: "Example Domain",
  });
});

test("rejects verifyText without expected text", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "verifyText",
            locatorRef: "common.pageHeading",
          },
        ],
      }),
    /expected is required/i,
  );
});

test("defaults retries to zero", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "screenshot",
      },
    ],
  });

  assert.equal(result.retries, 0);
});

test("validates retries", () => {
  const result = validateAutomationRequest({
    steps: [
      {
        action: "screenshot",
      },
    ],
    retries: 2,
  });

  assert.equal(result.retries, 2);
});

test("rejects negative retries", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "screenshot",
          },
        ],
        retries: -1,
      }),
    /retries must be a non-negative integer/i,
  );
});

test("rejects fractional retries", () => {
  assert.throws(
    () =>
      validateAutomationRequest({
        steps: [
          {
            action: "screenshot",
          },
        ],
        retries: 1.5,
      }),
    /retries must be a non-negative integer/i,
  );
});
