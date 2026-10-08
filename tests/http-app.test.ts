import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import type { AutomationExecutor } from "../src/application/automation-executor.js";
import { ScriptParser } from "../src/application/script-parser.js";
import { InMemoryAutomationQueue } from "../src/infrastructure/in-memory-automation-queue.js";
import { buildApp } from "../src/interfaces/http/app.js";
import { WorkflowCompiler } from "../src/application/workflow-compiler.js";
import { WorkflowValidator } from "../src/application/workflow-validator.js";

const unusedExecutor: AutomationExecutor = {
  async run() {
    throw new Error("Executor should not be called for queued jobs");
  },
};

function createWorkflowCompiler() {
  return new WorkflowCompiler(new WorkflowValidator());
}

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

  await app.close();
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

  await app.close();
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

test("queues an automation job", async () => {
  const queue = new InMemoryAutomationQueue();

  const app = buildApp(unusedExecutor, new ScriptParser(), queue);

  const response = await app.inject({
    method: "POST",
    url: "/automation/jobs",
    payload: {
      steps: [
        {
          action: "navigate",
          url: "https://example.com",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 202);

  const body = response.json();

  assert.ok(body.jobId);
  assert.equal(body.status, "queued");

  const job = await queue.get(body.jobId);

  assert.ok(job);
  assert.equal(job.status, "queued");

  await app.close();
});

test("returns an automation job by id", async () => {
  const queue = new InMemoryAutomationQueue();

  const job = await queue.enqueue({
    steps: [
      {
        action: "navigate",
        url: "https://example.com",
      },
    ],
  });

  const app = buildApp(unusedExecutor, new ScriptParser(), queue);

  const response = await app.inject({
    method: "GET",
    url: `/automation/jobs/${job.id}`,
  });

  assert.equal(response.statusCode, 200);

  const body = response.json();

  assert.equal(body.id, job.id);
  assert.equal(body.status, "queued");

  assert.deepEqual(body.request, job.request);

  await app.close();
});

test("returns 404 for an unknown automation job", async () => {
  const queue = new InMemoryAutomationQueue();

  const app = buildApp(unusedExecutor, new ScriptParser(), queue);

  const response = await app.inject({
    method: "GET",
    url: "/automation/jobs/missing-job",
  });

  assert.equal(response.statusCode, 404);

  const body = response.json();

  assert.equal(body.status, "failed");
  assert.equal(body.error.name, "NotFoundError");

  assert.match(
    body.error.message,
    /Automation job "missing-job" was not found/,
  );

  await app.close();
});

test("compiles and queues a visual automation workflow", async () => {
  const queue = new InMemoryAutomationQueue();

  const app = buildApp(
    unusedExecutor,
    new ScriptParser(),
    queue,
    createWorkflowCompiler(),
  );

  const response = await app.inject({
    method: "POST",
    url: "/automation/workflows/run",
    payload: {
      id: "login-workflow",
      name: "Login Workflow",
      settings: {
        captureTrace: true,
        retries: 2,
      },
      nodes: [
        {
          id: "navigate-1",
          type: "navigate",
          label: "Navigate",
          position: {
            x: 500,
            y: 300,
          },
          config: {
            url: "https://example.com/login",
          },
        },
        {
          id: "fill-1",
          type: "fill",
          label: "Fill",
          position: {
            x: 100,
            y: 700,
          },
          config: {
            locatorRef: "login.username",
            value: "raj",
          },
        },
        {
          id: "click-1",
          type: "click",
          label: "Click",
          position: {
            x: 900,
            y: 100,
          },
          config: {
            locatorRef: "login.submit",
          },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "navigate-1",
          target: "fill-1",
        },
        {
          id: "edge-2",
          source: "fill-1",
          target: "click-1",
        },
      ],
    },
  });

  assert.equal(response.statusCode, 202);

  const body = response.json();

  assert.ok(body.jobId);
  assert.equal(body.status, "queued");

  const job = await queue.get(body.jobId);

  assert.ok(job);

  assert.equal(job.status, "queued");

  assert.deepEqual(job.request, {
    steps: [
      {
        action: "navigate",
        url: "https://example.com/login",
      },
      {
        action: "fill",
        locatorRef: "login.username",
        value: "raj",
      },
      {
        action: "click",
        locatorRef: "login.submit",
      },
    ],
    captureTrace: true,
    retries: 2,
  });

  await app.close();
});

test("rejects an invalid visual automation workflow", async () => {
  const queue = new InMemoryAutomationQueue();

  const app = buildApp(
    unusedExecutor,
    new ScriptParser(),
    queue,
    createWorkflowCompiler(),
  );

  const response = await app.inject({
    method: "POST",
    url: "/automation/workflows/run",
    payload: {
      id: "invalid-workflow",
      name: "Invalid Workflow",
      settings: {
        captureTrace: true,
        retries: 0,
      },
      nodes: [],
      edges: [],
    },
  });

  assert.equal(response.statusCode, 400);

  const body = response.json();

  assert.equal(body.status, "failed");

  assert.equal(body.error.name, "ValidationError");

  assert.match(body.error.message, /at least one node/i);

  await app.close();
});

test("returns 503 for workflow execution when queue is not configured", async () => {
  const app = buildApp(
    unusedExecutor,
    new ScriptParser(),
    undefined,
    createWorkflowCompiler(),
  );

  const response = await app.inject({
    method: "POST",
    url: "/automation/workflows/run",
    payload: {},
  });

  assert.equal(response.statusCode, 503);

  const body = response.json();

  assert.equal(body.status, "failed");

  assert.equal(body.error.name, "ServiceUnavailableError");

  assert.match(body.error.message, /queue is not configured/i);

  await app.close();
});

test("returns 503 for workflow execution when compiler is not configured", async () => {
  const queue = new InMemoryAutomationQueue();

  const app = buildApp(unusedExecutor, new ScriptParser(), queue);

  const response = await app.inject({
    method: "POST",
    url: "/automation/workflows/run",
    payload: {},
  });

  assert.equal(response.statusCode, 503);

  const body = response.json();

  assert.equal(body.status, "failed");

  assert.equal(body.error.name, "ServiceUnavailableError");

  assert.match(body.error.message, /workflow compiler is not configured/i);

  await app.close();
});

test("serves a PNG automation artifact", async () => {
  const artifactDir = await mkdtemp(
    path.join(tmpdir(), "automation-artifacts-"),
  );

  const previousArtifactDir = process.env.ARTIFACT_DIR;

  try {
    process.env.ARTIFACT_DIR = artifactDir;

    const filename = "run-failed.png";
    const artifact = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    await writeFile(path.join(artifactDir, filename), artifact);

    const app = buildApp(unusedExecutor, new ScriptParser());

    try {
      const response = await app.inject({
        method: "GET",
        url: `/automation/artifacts/${filename}`,
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.headers["content-type"], "image/png");
      assert.deepEqual(response.rawPayload, artifact);
    } finally {
      await app.close();
    }
  } finally {
    if (previousArtifactDir === undefined) {
      delete process.env.ARTIFACT_DIR;
    } else {
      process.env.ARTIFACT_DIR = previousArtifactDir;
    }

    await rm(artifactDir, {
      recursive: true,
      force: true,
    });
  }
});

test("returns 404 for a missing automation artifact", async () => {
  const artifactDir = await mkdtemp(
    path.join(tmpdir(), "automation-artifacts-"),
  );

  const previousArtifactDir = process.env.ARTIFACT_DIR;

  try {
    process.env.ARTIFACT_DIR = artifactDir;

    const app = buildApp(unusedExecutor, new ScriptParser());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/automation/artifacts/missing.png",
      });

      assert.equal(response.statusCode, 404);

      const body = response.json();

      assert.equal(body.status, "failed");
      assert.equal(body.error.name, "NotFoundError");
      assert.match(body.error.message, /missing\.png.*not found/i);
    } finally {
      await app.close();
    }
  } finally {
    if (previousArtifactDir === undefined) {
      delete process.env.ARTIFACT_DIR;
    } else {
      process.env.ARTIFACT_DIR = previousArtifactDir;
    }

    await rm(artifactDir, {
      recursive: true,
      force: true,
    });
  }
});

test("does not serve files outside the artifact directory", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "automation-artifacts-"));

  const artifactDir = path.join(rootDir, "artifacts");

  const previousArtifactDir = process.env.ARTIFACT_DIR;

  try {
    await mkdir(artifactDir, {
      recursive: true,
    });

    await writeFile(path.join(rootDir, "secret.txt"), "must-not-be-served");

    process.env.ARTIFACT_DIR = artifactDir;

    const app = buildApp(unusedExecutor, new ScriptParser());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/automation/artifacts/%2e%2e%2fsecret.txt",
      });

      assert.notEqual(response.statusCode, 200);
      assert.notEqual(response.body, "must-not-be-served");
    } finally {
      await app.close();
    }
  } finally {
    if (previousArtifactDir === undefined) {
      delete process.env.ARTIFACT_DIR;
    } else {
      process.env.ARTIFACT_DIR = previousArtifactDir;
    }

    await rm(rootDir, {
      recursive: true,
      force: true,
    });
  }
});
