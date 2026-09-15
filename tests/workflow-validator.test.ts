import assert from "node:assert/strict";
import test from "node:test";

import { WorkflowValidator } from "../src/application/workflow-validator.js";
import type {
  AutomationWorkflow,
  WorkflowEdge,
  WorkflowNode,
} from "../src/domain/workflow.js";

function createWorkflow(): AutomationWorkflow {
  return {
    id: "login-test",
    name: "Login Test",
    settings: {
      captureTrace: true,

      retries: 0,
    },
    nodes: [
      {
        id: "navigate-1",
        type: "navigate",
        label: "Open login page",
        position: {
          x: 100,
          y: 100,
        },
        config: {
          url: "https://example.com/login",
        },
      },
      {
        id: "click-1",
        type: "click",
        label: "Click login",
        position: {
          x: 300,
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
        target: "click-1",
      },
    ],
  };
}

function asWorkflow(value: unknown): AutomationWorkflow {
  return value as AutomationWorkflow;
}

function requireNode(
  workflow: AutomationWorkflow,
  index: number,
): WorkflowNode {
  const node = workflow.nodes[index];

  if (!node) {
    throw new Error(`Expected workflow node at index ${index}`);
  }

  return node;
}

function requireEdge(
  workflow: AutomationWorkflow,
  index: number,
): WorkflowEdge {
  const edge = workflow.edges[index];

  if (!edge) {
    throw new Error(`Expected workflow edge at index ${index}`);
  }

  return edge;
}

test("accepts a valid workflow", () => {
  const validator = new WorkflowValidator();

  assert.doesNotThrow(() => {
    validator.validate(createWorkflow());
  });
});

test("rejects a workflow without nodes", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.nodes = [];
  workflow.edges = [];

  assert.throws(
    () => validator.validate(workflow),
    /Workflow must contain at least one node/,
  );
});

test("rejects duplicate node ids", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();
  const node = requireNode(workflow, 1);

  workflow.nodes[1] = {
    ...node,
    id: "navigate-1",
  };

  assert.throws(
    () => validator.validate(workflow),
    /Duplicate workflow node id: "navigate-1"/,
  );
});

test("rejects an edge with an unknown source node", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();
  const edge = requireEdge(workflow, 0);

  workflow.edges[0] = {
    ...edge,
    source: "missing-node",
  };

  assert.throws(
    () => validator.validate(workflow),
    /references unknown source node "missing-node"/,
  );
});

test("rejects an edge with an unknown target node", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();
  const edge = requireEdge(workflow, 0);

  workflow.edges[0] = {
    ...edge,
    target: "missing-node",
  };

  assert.throws(
    () => validator.validate(workflow),
    /references unknown target node "missing-node"/,
  );
});

test("rejects duplicate edge ids", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.edges.push({
    id: "edge-1",
    source: "navigate-1",
    target: "click-1",
  });

  assert.throws(
    () => validator.validate(workflow),
    /Duplicate workflow edge id: "edge-1"/,
  );
});

test("rejects self-referencing edges", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();
  const edge = requireEdge(workflow, 0);

  workflow.edges[0] = {
    ...edge,
    source: "navigate-1",
    target: "navigate-1",
  };

  assert.throws(
    () => validator.validate(workflow),
    /cannot connect node "navigate-1" to itself/,
  );
});

test("accepts a single-node workflow", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.nodes = [
    {
      id: "screenshot-1",
      type: "screenshot",
      label: "Take screenshot",
      position: {
        x: 100,
        y: 100,
      },
      config: {},
    },
  ];

  workflow.edges = [];

  assert.doesNotThrow(() => {
    validator.validate(workflow);
  });
});

test("rejects multiple outgoing edges from a node", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.nodes.push({
    id: "screenshot-1",
    type: "screenshot",
    label: "Take screenshot",
    position: {
      x: 500,
      y: 100,
    },
    config: {},
  });

  workflow.edges.push({
    id: "edge-2",
    source: "navigate-1",
    target: "screenshot-1",
  });

  assert.throws(
    () => validator.validate(workflow),
    /Workflow node "navigate-1" has multiple outgoing edges/,
  );
});

test("rejects multiple incoming edges to a node", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.nodes.push({
    id: "navigate-2",
    type: "navigate",
    label: "Open another page",
    position: {
      x: 100,
      y: 300,
    },
    config: {
      url: "https://example.com/other",
    },
  });

  workflow.edges.push({
    id: "edge-2",
    source: "navigate-2",
    target: "click-1",
  });

  assert.throws(
    () => validator.validate(workflow),
    /Workflow node "click-1" has multiple incoming edges/,
  );
});

test("rejects disconnected nodes", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.nodes.push({
    id: "screenshot-1",
    type: "screenshot",
    label: "Disconnected screenshot",
    position: {
      x: 500,
      y: 300,
    },
    config: {},
  });

  assert.throws(
    () => validator.validate(workflow),
    /Workflow must contain exactly one start node, but found 2/,
  );
});

test("rejects cycles", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  workflow.edges.push({
    id: "edge-2",
    source: "click-1",
    target: "navigate-1",
  });

  assert.throws(
    () => validator.validate(workflow),
    /Workflow must contain exactly one start node, but found 0/,
  );
});

test("rejects a non-boolean captureTrace setting", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  const invalidWorkflow = asWorkflow({
    ...workflow,
    settings: {
      ...workflow.settings,
      captureTrace: "yes",
    },
  });

  assert.throws(
    () => validator.validate(invalidWorkflow),
    /Workflow captureTrace setting must be a boolean/,
  );
});

test("rejects a negative retries setting", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  const invalidWorkflow = asWorkflow({
    ...workflow,
    settings: {
      ...workflow.settings,
      retries: -1,
    },
  });

  assert.throws(
    () => validator.validate(invalidWorkflow),
    /Workflow retries setting must be a non-negative integer/,
  );
});

test("rejects a fractional retries setting", () => {
  const validator = new WorkflowValidator();

  const workflow = createWorkflow();

  const invalidWorkflow = asWorkflow({
    ...workflow,
    settings: {
      ...workflow.settings,
      retries: 1.5,
    },
  });

  assert.throws(
    () => validator.validate(invalidWorkflow),
    /Workflow retries setting must be a non-negative integer/,
  );
});
