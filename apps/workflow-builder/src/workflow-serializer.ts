import type { Edge, Node } from "@xyflow/react";

import type { AutomationNodeData } from "./components/AutomationNode";

export interface WorkflowPosition {
  x: number;
  y: number;
}

interface BaseWorkflowNode {
  id: string;
  label: string;
  position: WorkflowPosition;
}

export interface NavigateWorkflowNode extends BaseWorkflowNode {
  type: "navigate";
  config: {
    url: string;
  };
}

export interface FillWorkflowNode extends BaseWorkflowNode {
  type: "fill";
  config: {
    locatorRef: string;
    value: string;
  };
}

export interface ClickWorkflowNode extends BaseWorkflowNode {
  type: "click";
  config: {
    locatorRef: string;
  };
}

export interface GetTextWorkflowNode extends BaseWorkflowNode {
  type: "getText";
  config: {
    locatorRef: string;
  };
}

export interface WaitForWorkflowNode extends BaseWorkflowNode {
  type: "waitFor";
  config: {
    locatorRef: string;
  };
}

export interface VerifyTextWorkflowNode extends BaseWorkflowNode {
  type: "verifyText";
  config: {
    locatorRef: string;
    expected: string;
  };
}

export interface ScreenshotWorkflowNode extends BaseWorkflowNode {
  type: "screenshot";
  config: Record<string, never>;
}

export type WorkflowNode =
  | NavigateWorkflowNode
  | FillWorkflowNode
  | ClickWorkflowNode
  | GetTextWorkflowNode
  | WaitForWorkflowNode
  | VerifyTextWorkflowNode
  | ScreenshotWorkflowNode;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  settings: {
    captureTrace: boolean;
    retries: number;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function serializeWorkflow(
  nodes: Node[],
  edges: Edge[],
): AutomationWorkflow {
  return {
    id: "visual-workflow",
    name: "Visual Workflow",

    settings: {
      captureTrace: true,
      retries: 0,
    },

    nodes: nodes.map(serializeNode),

    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

function serializeNode(node: Node): WorkflowNode {
  const data = node.data as AutomationNodeData;

  const base = {
    id: node.id,
    label: data.label,
    position: {
      x: node.position.x,
      y: node.position.y,
    },
  };

  switch (data.actionType) {
    case "navigate":
      return {
        ...base,
        type: "navigate",
        config: {
          url: data.url ?? "",
        },
      };

    case "fill":
      return {
        ...base,
        type: "fill",
        config: {
          locatorRef: data.locatorRef ?? "",
          value: data.value ?? "",
        },
      };

    case "click":
      return {
        ...base,
        type: "click",
        config: {
          locatorRef: data.locatorRef ?? "",
        },
      };

    case "getText":
      return {
        ...base,
        type: "getText",
        config: {
          locatorRef: data.locatorRef ?? "",
        },
      };

    case "waitFor":
      return {
        ...base,
        type: "waitFor",
        config: {
          locatorRef: data.locatorRef ?? "",
        },
      };

    case "verifyText":
      return {
        ...base,
        type: "verifyText",
        config: {
          locatorRef: data.locatorRef ?? "",
          expected: data.expected ?? "",
        },
      };

    case "screenshot":
      return {
        ...base,
        type: "screenshot",
        config: {},
      };
  }
}
