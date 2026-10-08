import "./ActionPalette.css";

export type AutomationActionType =
  | "navigate"
  | "fill"
  | "click"
  | "getText"
  | "waitFor"
  | "verifyText"
  | "screenshot";

interface ActionDefinition {
  type: AutomationActionType;
  label: string;
  description: string;
}

const actions: ActionDefinition[] = [
  {
    type: "navigate",
    label: "Navigate",
    description: "Open a URL",
  },
  {
    type: "fill",
    label: "Fill",
    description: "Enter a value",
  },
  {
    type: "click",
    label: "Click",
    description: "Click an element",
  },
  {
    type: "getText",
    label: "Get Text",
    description: "Read element text",
  },
  {
    type: "waitFor",
    label: "Wait For",
    description: "Wait for an element",
  },
  {
    type: "verifyText",
    label: "Verify Text",
    description: "Verify element text",
  },
  {
    type: "screenshot",
    label: "Screenshot",
    description: "Capture the page",
  },
];

interface ActionPaletteProps {
  onAddAction: (type: AutomationActionType, label: string) => void;
}

export function ActionPalette({ onAddAction }: ActionPaletteProps) {
  return (
    <aside className="action-palette">
      <h2>Actions</h2>

      <p className="action-palette__hint">
        Click an action to add it to the workflow.
      </p>

      <div className="action-palette__actions">
        {actions.map((action) => (
          <button
            key={action.type}
            type="button"
            className="action-palette__action"
            onClick={() => onAddAction(action.type, action.label)}
          >
            <strong>{action.label}</strong>
            <span>{action.description}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
