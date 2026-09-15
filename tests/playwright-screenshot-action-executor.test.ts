import { access, mkdir, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { chromium } from "playwright";

import { PlaywrightScreenshotActionExecutor } from "../src/infrastructure/playwright-screenshot-action-executor.js";

test("captures a screenshot artifact", async () => {
  const artifactDir = path.join("artifacts", "screenshot-action-test");

  await mkdir(artifactDir, {
    recursive: true,
  });

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(`
      <h1>Screenshot Test</h1>
    `);

    const executor = new PlaywrightScreenshotActionExecutor(page);

    const result = await executor.execute(
      {
        action: "screenshot",
      },
      {
        stepIndex: 2,
        artifactDir,
        runId: "test-run",
      },
    );

    const expectedPath = path.join(artifactDir, "test-run-step-2.png");

    assert.equal(result.index, 2);
    assert.equal(result.action, "screenshot");
    assert.equal(result.status, "passed");
    assert.equal(result.artifact, expectedPath);

    await access(expectedPath);
  } finally {
    await browser.close();

    await rm(artifactDir, {
      recursive: true,
      force: true,
    });
  }
});

test("requires an artifact directory", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const executor = new PlaywrightScreenshotActionExecutor(page);

    await assert.rejects(
      executor.execute(
        {
          action: "screenshot",
        },
        {
          stepIndex: 0,
          runId: "test-run",
        },
      ),
      /artifactDir is required/,
    );
  } finally {
    await browser.close();
  }
});

test("requires a run id", async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const executor = new PlaywrightScreenshotActionExecutor(page);

    await assert.rejects(
      executor.execute(
        {
          action: "screenshot",
        },
        {
          stepIndex: 0,
          artifactDir: "./artifacts",
        },
      ),
      /runId is required/,
    );
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

    const executor = new PlaywrightScreenshotActionExecutor(page);

    await assert.rejects(
      executor.execute(
        {
          action: "navigate",
          url: "https://example.com",
        },
        {
          stepIndex: 0,
          artifactDir: "./artifacts",
          runId: "test-run",
        },
      ),
      /does not support action "navigate"/,
    );
  } finally {
    await browser.close();
  }
});
