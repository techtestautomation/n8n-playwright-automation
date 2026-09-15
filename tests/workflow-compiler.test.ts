import assert from "node:assert/strict";
import test from "node:test";

import { WorkflowCompiler } from "../src/application/workflow-compiler.js";
import { WorkflowValidator } from "../src/application/workflow-validator.js";
import type { AutomationWorkflow } from "../src/domain/workflow.js";

function createCompiler(): WorkflowCompiler {
  return new WorkflowCompiler(new WorkflowValidator());
}

test("compiles a linear workflow into automation actions", () => {
  const compiler = createCompiler();

  const workflow: AutomationWorkflow = {
    id: "login-test",
    name: "Login Test",
    settings: {
      captureTrace: false,
      retries: 2,
    },
    nodes: [
      {
        id: "navigate-1",
        type: "navigate",
        label: "Open page",
        position: {
          x: 100,
          y: 100,
        },
        config: {
          url: "https://example.com/login",
        },
      },
      {
        id: "fill-1",
        type: "fill",
        label: "Enter username",
        position: {
          x: 300,
          y: 100,
        },
        config: {
          locatorRef: "login.username",
          value: "Raj",
        },
      },
      {
        id: "click-1",
        type: "click",
        label: "Submit",
        position: {
          x: 500,
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
  };

  const result = compiler.compile(workflow);

  assert.deepEqual(result, {
    steps: [
      {
        action: "navigate",
        url: "https://example.com/login",
      },
      {
        action: "fill",
        locatorRef: "login.username",
        value: "Raj",
      },
      {
        action: "click",
        locatorRef: "login.submit",
      },
    ],
    captureTrace: false,
    retries: 2,
  });
});

test("uses graph edges instead of node array or visual position for execution order", () => {
  const compiler = createCompiler();

  const workflow: AutomationWorkflow = {
    id: "scrambled-test",
    name: "Scrambled Test",
    settings: {
      captureTrace: true,
      retries: 0,
    },
    nodes: [
      {
        id: "click-1",
        type: "click",
        label: "Click submit",
        position: {
          x: 50,
          y: 50,
        },
        config: {
          locatorRef: "login.submit",
        },
      },
      {
        id: "navigate-1",
        type: "navigate",
        label: "Open page",
        position: {
          x: 900,
          y: 600,
        },
        config: {
          url: "https://example.com/login",
        },
      },
      {
        id: "fill-1",
        type: "fill",
        label: "Enter username",
        position: {
          x: 10,
          y: 900,
        },
        config: {
          locatorRef: "login.username",
          value: "Raj",
        },
      },
    ],
    edges: [
      {
        id: "edge-2",
        source: "fill-1",
        target: "click-1",
      },
      {
        id: "edge-1",
        source: "navigate-1",
        target: "fill-1",
      },
    ],
  };

  const result = compiler.compile(workflow);

  assert.deepEqual(
    result.steps.map((step) => step.action),
    ["navigate", "fill", "click"],
  );
});

test("compiles all supported workflow node types", () => {
  const compiler = createCompiler();

  const workflow: AutomationWorkflow = {
    id: "all-actions",
    name: "All Actions",
    settings: {
      captureTrace: true,
      retries: 0,
    },
    nodes: [
      {
        id: "navigate",
        type: "navigate",
        label: "Navigate",
        position: { x: 0, y: 0 },
        config: {
          url: "https://example.com",
        },
      },
      {
        id: "fill",
        type: "fill",
        label: "Fill",
        position: { x: 100, y: 0 },
        config: {
          locatorRef: "page.input",
          value: "Hello",
        },
      },
      {
        id: "click",
        type: "click",
        label: "Click",
        position: { x: 200, y: 0 },
        config: {
          locatorRef: "page.button",
        },
      },
      {
        id: "wait",
        type: "waitFor",
        label: "Wait",
        position: { x: 300, y: 0 },
        config: {
          locatorRef: "page.result",
        },
      },
      {
        id: "read",
        type: "getText",
        label: "Read",
        position: { x: 400, y: 0 },
        config: {
          locatorRef: "page.result",
        },
      },
      {
        id: "verify",
        type: "verifyText",
        label: "Verify",
        position: { x: 500, y: 0 },
        config: {
          locatorRef: "page.result",
          expected: "Hello",
        },
      },
      {
        id: "screenshot",
        type: "screenshot",
        label: "Screenshot",
        position: { x: 600, y: 0 },
        config: {},
      },
    ],
    edges: [
      {
        id: "e1",
        source: "navigate",
        target: "fill",
      },
      {
        id: "e2",
        source: "fill",
        target: "click",
      },
      {
        id: "e3",
        source: "click",
        target: "wait",
      },
      {
        id: "e4",
        source: "wait",
        target: "read",
      },
      {
        id: "e5",
        source: "read",
        target: "verify",
      },
      {
        id: "e6",
        source: "verify",
        target: "screenshot",
      },
    ],
  };

  const result = compiler.compile(workflow);

  assert.deepEqual(result.steps, [
    {
      action: "navigate",
      url: "https://example.com",
    },
    {
      action: "fill",
      locatorRef: "page.input",
      value: "Hello",
    },
    {
      action: "click",
      locatorRef: "page.button",
    },
    {
      action: "waitFor",
      locatorRef: "page.result",
    },
    {
      action: "getText",
      locatorRef: "page.result",
    },
    {
      action: "verifyText",
      locatorRef: "page.result",
      expected: "Hello",
    },
    {
      action: "screenshot",
    },
  ]);
});

test("rejects an invalid workflow before compilation", () => {
  const compiler = createCompiler();

  const workflow: AutomationWorkflow = {
    id: "invalid",
    name: "Invalid Workflow",
    settings: {
      captureTrace: true,
      retries: 0,
    },
    nodes: [],
    edges: [],
  };

  assert.throws(
    () => compiler.compile(workflow),
    /Workflow must contain at least one node/,
  );
});
