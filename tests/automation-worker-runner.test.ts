import assert from "node:assert/strict";
import test from "node:test";

import type { AutomationExecutor } from "../src/application/automation-executor.js";
import { AutomationWorkerRunner } from "../src/application/automation-worker-runner.js";
import { DefaultAutomationWorker } from "../src/infrastructure/automation-worker.js";
import { InMemoryAutomationQueue } from "../src/infrastructure/in-memory-automation-queue.js";

test("processes the next queued job", async () => {
  const queue = new InMemoryAutomationQueue();

  const first = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://first.example.com",
      },
    ],
  });

  const second = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://second.example.com",
      },
    ],
  });

  const executor: AutomationExecutor = {
    async run() {
      return {
        status: "passed",
        startedAt: new Date().toISOString(),
        durationMs: 1,
        steps: [],
        artifacts: {},
      };
    },
  };

  const worker = new DefaultAutomationWorker(queue, executor);

  const runner = new AutomationWorkerRunner(queue, worker);

  const processed = await runner.runOnce();

  assert.equal(processed, true);

  const firstJob = await queue.get(first.id);
  const secondJob = await queue.get(second.id);

  assert.equal(firstJob?.status, "completed");
  assert.equal(secondJob?.status, "queued");
});

test("returns false when there are no queued jobs", async () => {
  const queue = new InMemoryAutomationQueue();

  const executor: AutomationExecutor = {
    async run() {
      throw new Error("Executor should not be called");
    },
  };

  const worker = new DefaultAutomationWorker(queue, executor);

  const runner = new AutomationWorkerRunner(queue, worker);

  const processed = await runner.runOnce();

  assert.equal(processed, false);
});

test("continuously processes queued jobs until stopped", async () => {
  const queue = new InMemoryAutomationQueue();

  const executor: AutomationExecutor = {
    async run() {
      return {
        status: "passed",
        startedAt: new Date().toISOString(),
        durationMs: 1,
        steps: [],
        artifacts: {},
      };
    },
  };

  const worker = new DefaultAutomationWorker(queue, executor);

  const runner = new AutomationWorkerRunner(queue, worker, 10);

  const running = runner.start();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });

  runner.stop();
  await running;

  const completedJob = await queue.get(job.id);

  assert.equal(completedJob?.status, "completed");
});

test("stops cleanly while waiting for jobs", async () => {
  const queue = new InMemoryAutomationQueue();

  const executor: AutomationExecutor = {
    async run() {
      throw new Error("Executor should not be called");
    },
  };

  const worker = new DefaultAutomationWorker(queue, executor);

  const runner = new AutomationWorkerRunner(queue, worker, 10);

  const running = runner.start();

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 20);
  });

  runner.stop();

  await running;
});
