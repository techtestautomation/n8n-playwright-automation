import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryAutomationQueue } from "../src/infrastructure/in-memory-automation-queue.js";

test("enqueues an automation job", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  assert.ok(job.id);
  assert.equal(job.status, "queued");
  assert.ok(job.createdAt);

  assert.deepEqual(job.request, {
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  const storedJob = await queue.get(job.id);

  assert.deepEqual(storedJob, job);
});

test("updates a job to running", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  await queue.updateStatus(job.id, "running");

  const storedJob = await queue.get(job.id);

  assert.ok(storedJob);
  assert.equal(storedJob.status, "running");
  assert.ok(storedJob.startedAt);
});

test("completes a successful automation job", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  await queue.updateStatus(job.id, "running");

  await queue.complete(job.id, {
    status: "passed",
    startedAt: new Date().toISOString(),
    durationMs: 100,
    artifacts: {},
  });

  const storedJob = await queue.get(job.id);

  assert.ok(storedJob);
  assert.equal(storedJob.status, "completed");
  assert.equal(storedJob.result?.status, "passed");
  assert.ok(storedJob.completedAt);
});

test("marks a failed automation result as failed", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  await queue.updateStatus(job.id, "running");

  await queue.complete(job.id, {
    status: "failed",
    startedAt: new Date().toISOString(),
    durationMs: 100,
    artifacts: {},
    error: {
      name: "Error",
      message: "Automation failed",
    },
  });

  const storedJob = await queue.get(job.id);

  assert.ok(storedJob);
  assert.equal(storedJob.status, "failed");
  assert.equal(storedJob.result?.status, "failed");
  assert.ok(storedJob.completedAt);
});

test("throws when updating an unknown job", async () => {
  const queue = new InMemoryAutomationQueue();

  await assert.rejects(
    queue.updateStatus("missing-job", "running"),
    /Automation job "missing-job" was not found/,
  );
});

test("claims the oldest queued job", async () => {
  const queue = new InMemoryAutomationQueue();

  const first = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://first.example.com",
      },
    ],
  });

  await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://second.example.com",
      },
    ],
  });

  const claimed = await queue.claimNext();

  assert.equal(claimed?.id, first.id);
  assert.equal(claimed?.status, "running");
  assert.ok(claimed?.startedAt);
});

test("returns undefined when no queued jobs remain", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  await queue.updateStatus(job.id, "running");

  const next = await queue.claimNext();

  assert.equal(next, undefined);
});

test("does not claim the same job twice", async () => {
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

  const [claimA, claimB] = await Promise.all([
    queue.claimNext(),
    queue.claimNext(),
  ]);

  assert.equal(claimA?.id, first.id);
  assert.equal(claimB?.id, second.id);

  assert.notEqual(claimA?.id, claimB?.id);

  assert.equal(claimA?.status, "running");
  assert.equal(claimB?.status, "running");

  assert.ok(claimA?.startedAt);
  assert.ok(claimB?.startedAt);
});
