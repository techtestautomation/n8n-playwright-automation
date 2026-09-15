import assert from "node:assert/strict";
import test from "node:test";

import type { AutomationExecutor } from "../src/application/automation-executor.js";
import type {
  AutomationRunRequest,
  AutomationRunResult,
} from "../src/domain/automation.js";
import { DefaultAutomationWorker } from "../src/infrastructure/automation-worker.js";
import { InMemoryAutomationQueue } from "../src/infrastructure/in-memory-automation-queue.js";

class FakeAutomationExecutor implements AutomationExecutor {
  requests: AutomationRunRequest[] = [];

  constructor(private readonly result: AutomationRunResult) {}

  async run(request: AutomationRunRequest): Promise<AutomationRunResult> {
    this.requests.push(request);

    return this.result;
  }
}

test("processes a claimed automation job", async () => {
  const queue = new InMemoryAutomationQueue();

  const request: AutomationRunRequest = {
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  };

  const job = await queue.enqueue(request);

  const claimedJob = await queue.claimNext();

  assert.equal(claimedJob?.id, job.id);
  assert.equal(claimedJob?.status, "running");
  assert.ok(claimedJob?.startedAt);

  const executor = new FakeAutomationExecutor({
    status: "passed",
    startedAt: new Date().toISOString(),
    durationMs: 100,
    artifacts: {},
  });

  const worker = new DefaultAutomationWorker(queue, executor);

  await worker.process(job.id);

  assert.deepEqual(executor.requests, [request]);

  const completedJob = await queue.get(job.id);

  assert.ok(completedJob);
  assert.equal(completedJob.status, "completed");
  assert.equal(completedJob.result?.status, "passed");
  assert.ok(completedJob.startedAt);
  assert.ok(completedJob.completedAt);
});

test("stores a failed automation result", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  const claimedJob = await queue.claimNext();

  assert.equal(claimedJob?.id, job.id);
  assert.equal(claimedJob?.status, "running");
  assert.ok(claimedJob?.startedAt);

  const executor = new FakeAutomationExecutor({
    status: "failed",
    startedAt: new Date().toISOString(),
    durationMs: 100,
    artifacts: {},
    error: {
      name: "Error",
      message: "Automation failed",
    },
  });

  const worker = new DefaultAutomationWorker(queue, executor);

  await worker.process(job.id);

  const failedJob = await queue.get(job.id);

  assert.ok(failedJob);
  assert.equal(failedJob.status, "failed");
  assert.equal(failedJob.result?.error?.message, "Automation failed");
  assert.ok(failedJob.startedAt);
  assert.ok(failedJob.completedAt);
});

test("throws when processing an unknown job", async () => {
  const queue = new InMemoryAutomationQueue();

  const executor = new FakeAutomationExecutor({
    status: "passed",
    startedAt: new Date().toISOString(),
    durationMs: 100,
    artifacts: {},
  });

  const worker = new DefaultAutomationWorker(queue, executor);

  await assert.rejects(
    worker.process("missing-job"),
    /Automation job "missing-job" was not found/,
  );

  assert.equal(executor.requests.length, 0);
});
