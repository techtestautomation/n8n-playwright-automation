import { Handle, Position, type NodeProps } from "@xyflow/react";

import "./AutomationNode.css";

export type AutomationNodeData = {
  actionType:
    | "navigate"
    | "fill"
    | "click"
    | "getText"
    | "waitFor"
    | "verifyText"
    | "screenshot";
  label: string;
  description?: string;
  url?: string;
  locatorRef?: string;
  value?: string;
  expected?: string;
};

export function AutomationNode({ data }: NodeProps) {
  const nodeData = data as AutomationNodeData;

  return (
    <div className="automation-node">
      <Handle type="target" position={Position.Left} />

      <div className="automation-node__title">{nodeData.label}</div>

      {nodeData.description && (
        <div className="automation-node__description">
          {nodeData.description}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
