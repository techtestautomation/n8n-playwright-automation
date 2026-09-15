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

export interface WorkflowExecutionSettings {
  captureTrace: boolean;
  retries: number;
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowExecutionSettings;
}
