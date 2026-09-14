import assert from "node:assert/strict";
import test from "node:test";

import { ScriptParser } from "../src/application/script-parser.js";

test("parses a simple automation script", () => {
  const parser = new ScriptParser();

  const result = parser.parse(`
    OPEN https://example.com
    READ common.pageHeading
    SCREENSHOT
  `);

  assert.equal(result.captureTrace, true);
  assert.equal(result.steps.length, 3);

  assert.deepEqual(result.steps[0], {
    action: "navigate",
    url: "https://example.com",
  });

  assert.deepEqual(result.steps[1], {
    action: "getText",
    locatorRef: "common.pageHeading",
  });

  assert.deepEqual(result.steps[2], {
    action: "screenshot",
  });
});

test("ignores blank lines", () => {
  const parser = new ScriptParser();

  const result = parser.parse(`

    OPEN https://example.com

    SCREENSHOT

  `);

  assert.equal(result.steps.length, 2);
});

test("rejects an empty script", () => {
  const parser = new ScriptParser();

  assert.throws(() => parser.parse("   \n   "), /at least one command/i);
});

test("rejects OPEN without a URL", () => {
  const parser = new ScriptParser();

  assert.throws(() => parser.parse("OPEN"), /OPEN requires a URL/i);
});

test("rejects READ without an element reference", () => {
  const parser = new ScriptParser();

  assert.throws(
    () => parser.parse("READ"),
    /READ requires an element reference/i,
  );
});

test("reports the line number for unsupported commands", () => {
  const parser = new ScriptParser();

  assert.throws(
    () =>
      parser.parse(`
        OPEN https://example.com
        DANCE common.pageHeading
      `),
    /Line 2: Unsupported command/i,
  );
});

test("parses VERIFY TEXT", () => {
  const parser = new ScriptParser();

  const result = parser.parse(
    "VERIFY TEXT common.pageHeading = Example Domain",
  );

  assert.deepEqual(result.steps[0], {
    action: "verifyText",
    locatorRef: "common.pageHeading",
    expected: "Example Domain",
  });
});

test("VERIFY TEXT supports spaces in expected text", () => {
  const parser = new ScriptParser();

  const result = parser.parse(
    "VERIFY TEXT common.pageHeading = Welcome to Example Domain",
  );

  const step = result.steps[0];

  assert.equal(step?.action, "verifyText");

  if (step?.action === "verifyText") {
    assert.equal(step.expected, "Welcome to Example Domain");
  }
});

test("rejects malformed VERIFY TEXT", () => {
  const parser = new ScriptParser();

  assert.throws(
    () => parser.parse("VERIFY TEXT common.pageHeading"),
    /Expected VERIFY TEXT/i,
  );
});
