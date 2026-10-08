import type { Node } from "@xyflow/react";

import type { AutomationNodeData } from "./AutomationNode";
import "./NodeConfigurationPanel.css";

interface NodeConfigurationPanelProps {
  node: Node | undefined;
  onUpdateNode: (nodeId: string, data: Partial<AutomationNodeData>) => void;
}

export function NodeConfigurationPanel({
  node,
  onUpdateNode,
}: NodeConfigurationPanelProps) {
  if (!node) {
    return (
      <aside className="node-configuration">
        <h2>Configuration</h2>

        <p className="node-configuration__empty">
          Select an action to configure it.
        </p>
      </aside>
    );
  }

  const data = node.data as AutomationNodeData;

  const updateLocatorRef = (locatorRef: string) => {
    onUpdateNode(node.id, {
      locatorRef,
      description: locatorRef || "Not configured",
    });
  };

  const renderLocatorField = (placeholder: string) => (
    <label className="node-configuration__field">
      <span>Locator Reference</span>

      <input
        type="text"
        value={data.locatorRef ?? ""}
        placeholder={placeholder}
        onChange={(event) => {
          updateLocatorRef(event.target.value);
        }}
      />
    </label>
  );

  return (
    <aside className="node-configuration">
      <h2>Configuration</h2>

      <div className="node-configuration__type">{data.label}</div>

      {data.actionType === "navigate" && (
        <label className="node-configuration__field">
          <span>URL</span>

          <input
            type="url"
            value={data.url ?? ""}
            placeholder="https://example.com"
            onChange={(event) => {
              const url = event.target.value;

              onUpdateNode(node.id, {
                url,
                description: url || "Not configured",
              });
            }}
          />
        </label>
      )}

      {data.actionType === "fill" && (
        <>
          {renderLocatorField("login.username")}

          <label className="node-configuration__field">
            <span>Value</span>

            <input
              type="text"
              value={data.value ?? ""}
              placeholder="Value to enter"
              onChange={(event) => {
                onUpdateNode(node.id, {
                  value: event.target.value,
                });
              }}
            />
          </label>
        </>
      )}

      {data.actionType === "click" && renderLocatorField("login.submit")}

      {data.actionType === "getText" && renderLocatorField("test-page.result")}

      {data.actionType === "waitFor" && renderLocatorField("test-page.result")}

      {data.actionType === "verifyText" && (
        <>
          {renderLocatorField("test-page.result")}

          <label className="node-configuration__field">
            <span>Expected Text</span>

            <input
              type="text"
              value={data.expected ?? ""}
              placeholder="Expected text"
              onChange={(event) => {
                onUpdateNode(node.id, {
                  expected: event.target.value,
                });
              }}
            />
          </label>
        </>
      )}

      {data.actionType === "screenshot" && (
        <p className="node-configuration__empty">
          Screenshot does not require any configuration.
        </p>
      )}
    </aside>
  );
}
