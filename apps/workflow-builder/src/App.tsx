import { useState } from "react";
import {
  addEdge,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { ActionPalette } from "./components/ActionPalette";
import {
  AutomationNode,
  type AutomationNodeData,
} from "./components/AutomationNode";
import { ExecutionResultPanel } from "./components/ExecutionResultPanel";
import { NodeConfigurationPanel } from "./components/NodeConfigurationPanel";
import {
  getAutomationJob,
  runWorkflow,
  type AutomationJob,
} from "./workflow-api";
import {
  serializeWorkflow,
  type AutomationWorkflow,
} from "./workflow-serializer";

import "./App.css";

const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_DURATION_MS = 60_000;

const nodeTypes = {
  automation: AutomationNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "automation",
    position: {
      x: 100,
      y: 100,
    },
    data: {
      actionType: "navigate",
      label: "Navigate",
      description: "Open a URL",
      url: "https://example.com",
    } satisfies AutomationNodeData,
  },
];

const initialEdges: Edge[] = [];

async function waitForJobCompletion(jobId: string): Promise<AutomationJob> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
    const job = await getAutomationJob(jobId);

    if (job.status === "completed" || job.status === "failed") {
      return job;
    }

    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, POLL_INTERVAL_MS);
    });
  }

  throw new Error(`Timed out waiting for job ${jobId} after 60 seconds`);
}

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [selectedNodeId, setSelectedNodeId] = useState<string>();

  const [workflowPreview, setWorkflowPreview] = useState<AutomationWorkflow>();

  const [runStatus, setRunStatus] = useState<string>();

  const [isRunning, setIsRunning] = useState(false);

  const [executionJob, setExecutionJob] = useState<AutomationJob>();

  const [executionError, setExecutionError] = useState<string>();

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  function handleConnect(connection: Connection) {
    setEdges((currentEdges) => addEdge(connection, currentEdges));
  }

  function handleAddAction(
    actionType: AutomationNodeData["actionType"],
    label: string,
  ) {
    const id = crypto.randomUUID();

    const newNode: Node = {
      id,
      type: "automation",
      position: {
        x: 150 + nodes.length * 40,
        y: 150 + nodes.length * 40,
      },
      data: {
        actionType,
        label,
      } satisfies AutomationNodeData,
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);

    setSelectedNodeId(id);
  }

  function handleUpdateNode(nodeId: string, data: Partial<AutomationNodeData>) {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          : node,
      ),
    );
  }

  function previewWorkflow() {
    const workflow = serializeWorkflow(nodes, edges);

    setWorkflowPreview(workflow);
  }

  async function submitWorkflow() {
    setIsRunning(true);
    setRunStatus(undefined);
    setExecutionJob(undefined);
    setExecutionError(undefined);
    setWorkflowPreview(undefined);

    try {
      const workflow = serializeWorkflow(nodes, edges);

      const response = await runWorkflow(workflow);

      setRunStatus(`Running: ${response.jobId}`);

      const completedJob = await waitForJobCompletion(response.jobId);

      setExecutionJob(completedJob);
      setRunStatus(undefined);

    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown execution error";

      setRunStatus("Execution failed");

      setExecutionError(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Automation Workflow Builder</h1>

          <p>Build and execute Playwright automation workflows visually.</p>
        </div>

        <div className="app-header__actions">
          <button
            type="button"
            className="preview-button"
            onClick={previewWorkflow}
          >
            Preview Workflow
          </button>

          <button
            type="button"
            className="run-button"
            onClick={() => {
              void submitWorkflow();
            }}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Workflow"}
          </button>
        </div>
      </header>

      {runStatus && <div className="run-status">{runStatus}</div>}

      {executionError && (
        <div className="execution-error" role="alert">
          <strong>Execution Error</strong>

          <div>{executionError}</div>
        </div>
      )}

      <main className="workflow-workspace">
        <aside className="app__palette">
          <ActionPalette onAddAction={handleAddAction} />
        </aside>

        <section className="workflow-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={(_event, node) => {
              setSelectedNodeId(node.id);
            }}
            onPaneClick={() => {
              setSelectedNodeId(undefined);
            }}
            fitView
          >
            <Controls />
          </ReactFlow>
        </section>

        <aside className="app__configuration">
          <NodeConfigurationPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
          />
        </aside>
      </main>

      {workflowPreview && (
        <section className="workflow-preview">
          <div className="workflow-preview__header">
            <h2>Workflow JSON</h2>

            <button
              type="button"
              onClick={() => {
                setWorkflowPreview(undefined);
              }}
            >
              Close
            </button>
          </div>

          <pre>{JSON.stringify(workflowPreview, null, 2)}</pre>
        </section>
      )}

      {executionJob && <ExecutionResultPanel job={executionJob} />}
    </div>
  );
}

export default App;
