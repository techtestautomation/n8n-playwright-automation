import { describe, expect, it } from "vitest";

import type { Edge, Node } from "@xyflow/react";

import { serializeWorkflow } from "./workflow-serializer";

describe("serializeWorkflow", () => {
  it("serializes navigate, fill and click nodes", () => {
    const nodes: Node[] = [
      {
        id: "navigate-1",
        type: "automation",
        position: {
          x: 100,
          y: 120,
        },
        data: {
          actionType: "navigate",
          label: "Navigate",
          url: "https://example.com/login",
        },
      },
      {
        id: "fill-1",
        type: "automation",
        position: {
          x: 350,
          y: 120,
        },
        data: {
          actionType: "fill",
          label: "Fill",
          locatorRef: "login.username",
          value: "raj",
        },
      },
      {
        id: "click-1",
        type: "automation",
        position: {
          x: 600,
          y: 120,
        },
        data: {
          actionType: "click",
          label: "Click",
          locatorRef: "login.submit",
        },
      },
    ];

    const edges: Edge[] = [
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
    ];

    const workflow = serializeWorkflow(nodes, edges);

    expect(workflow.nodes).toEqual([
      {
        id: "navigate-1",
        label: "Navigate",
        position: {
          x: 100,
          y: 120,
        },
        type: "navigate",
        config: {
          url: "https://example.com/login",
        },
      },
      {
        id: "fill-1",
        label: "Fill",
        position: {
          x: 350,
          y: 120,
        },
        type: "fill",
        config: {
          locatorRef: "login.username",
          value: "raj",
        },
      },
      {
        id: "click-1",
        label: "Click",
        position: {
          x: 600,
          y: 120,
        },
        type: "click",
        config: {
          locatorRef: "login.submit",
        },
      },
    ]);

    expect(workflow.edges).toEqual(edges);
  });

  it("serializes all supported action types", () => {
    const nodes: Node[] = [
      {
        id: "navigate",
        position: { x: 0, y: 0 },
        data: {
          actionType: "navigate",
          label: "Navigate",
          url: "https://example.com",
        },
      },
      {
        id: "fill",
        position: { x: 0, y: 0 },
        data: {
          actionType: "fill",
          label: "Fill",
          locatorRef: "login.username",
          value: "user",
        },
      },
      {
        id: "click",
        position: { x: 0, y: 0 },
        data: {
          actionType: "click",
          label: "Click",
          locatorRef: "login.submit",
        },
      },
      {
        id: "get-text",
        position: { x: 0, y: 0 },
        data: {
          actionType: "getText",
          label: "Get Text",
          locatorRef: "test-page.result",
        },
      },
      {
        id: "wait-for",
        position: { x: 0, y: 0 },
        data: {
          actionType: "waitFor",
          label: "Wait For",
          locatorRef: "test-page.result",
        },
      },
      {
        id: "verify-text",
        position: { x: 0, y: 0 },
        data: {
          actionType: "verifyText",
          label: "Verify Text",
          locatorRef: "test-page.result",
          expected: "Success",
        },
      },
      {
        id: "screenshot",
        position: { x: 0, y: 0 },
        data: {
          actionType: "screenshot",
          label: "Screenshot",
        },
      },
    ];

    const workflow = serializeWorkflow(nodes, []);

    expect(workflow.nodes.map((node) => node.type)).toEqual([
      "navigate",
      "fill",
      "click",
      "getText",
      "waitFor",
      "verifyText",
      "screenshot",
    ]);

    expect(workflow.nodes[5]).toEqual({
      id: "verify-text",
      label: "Verify Text",
      position: { x: 0, y: 0 },
      type: "verifyText",
      config: {
        locatorRef: "test-page.result",
        expected: "Success",
      },
    });

    expect(workflow.nodes[6]).toEqual({
      id: "screenshot",
      label: "Screenshot",
      position: { x: 0, y: 0 },
      type: "screenshot",
      config: {},
    });
  });

  it("preserves node positions and edges", () => {
    const nodes: Node[] = [
      {
        id: "first",
        position: {
          x: 731,
          y: 284,
        },
        data: {
          actionType: "navigate",
          label: "Navigate",
          url: "https://example.com",
        },
      },
      {
        id: "second",
        position: {
          x: 114,
          y: 612,
        },
        data: {
          actionType: "click",
          label: "Click",
          locatorRef: "common.button",
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: "connection-1",
        source: "first",
        target: "second",
      },
    ];

    const workflow = serializeWorkflow(nodes, edges);

    expect(workflow.nodes[0]?.position).toEqual({
      x: 731,
      y: 284,
    });

    expect(workflow.nodes[1]?.position).toEqual({
      x: 114,
      y: 612,
    });

    expect(workflow.edges).toEqual([
      {
        id: "connection-1",
        source: "first",
        target: "second",
      },
    ]);
  });

  it("uses the expected workflow defaults", () => {
    const nodes: Node[] = [
      {
        id: "screenshot-1",
        position: { x: 0, y: 0 },
        data: {
          actionType: "screenshot",
          label: "Screenshot",
        },
      },
    ];

    const workflow = serializeWorkflow(nodes, []);

    expect(workflow.id).toBe("visual-workflow");

    expect(workflow.name).toBe("Visual Workflow");

    expect(workflow.settings).toEqual({
      captureTrace: true,
      retries: 0,
    });
  });

  it("does not derive execution order from visual position", () => {
    const nodes: Node[] = [
      {
        id: "click",
        position: {
          x: 100,
          y: 100,
        },
        data: {
          actionType: "click",
          label: "Click",
          locatorRef: "login.submit",
        },
      },
      {
        id: "navigate",
        position: {
          x: 900,
          y: 500,
        },
        data: {
          actionType: "navigate",
          label: "Navigate",
          url: "https://example.com",
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: "execution-edge",
        source: "navigate",
        target: "click",
      },
    ];

    const workflow = serializeWorkflow(nodes, edges);

    // Serialization preserves canvas state.
    expect(workflow.nodes.map((node) => node.id)).toEqual([
      "click",
      "navigate",
    ]);

    // Execution semantics are represented by
    // the graph, not x/y position or array order.
    expect(workflow.edges).toEqual([
      {
        id: "execution-edge",
        source: "navigate",
        target: "click",
      },
    ]);
  });
});
