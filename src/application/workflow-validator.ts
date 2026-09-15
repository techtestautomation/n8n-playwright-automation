import type { AutomationWorkflow, WorkflowNode } from "../domain/workflow.js";

export class WorkflowValidator {
  validate(workflow: AutomationWorkflow): void {
    this.validateWorkflowIdentity(workflow);
    this.validateSettings(workflow);
    this.validateNodes(workflow.nodes);
    this.validateEdges(workflow);
    this.validateLinearGraph(workflow);
  }

  private validateWorkflowIdentity(workflow: AutomationWorkflow): void {
    if (!workflow.id.trim()) {
      throw new Error("Workflow id must not be empty");
    }

    if (!workflow.name.trim()) {
      throw new Error("Workflow name must not be empty");
    }
  }

  private validateNodes(nodes: WorkflowNode[]): void {
    if (nodes.length === 0) {
      throw new Error("Workflow must contain at least one node");
    }

    const nodeIds = new Set<string>();

    for (const node of nodes) {
      if (!node.id.trim()) {
        throw new Error("Workflow node id must not be empty");
      }

      if (nodeIds.has(node.id)) {
        throw new Error(`Duplicate workflow node id: "${node.id}"`);
      }

      nodeIds.add(node.id);
    }
  }

  private validateSettings(workflow: AutomationWorkflow): void {
    if (typeof workflow.settings.captureTrace !== "boolean") {
      throw new Error("Workflow captureTrace setting must be a boolean");
    }

    if (
      typeof workflow.settings.retries !== "number" ||
      !Number.isInteger(workflow.settings.retries) ||
      workflow.settings.retries < 0
    ) {
      throw new Error(
        "Workflow retries setting must be a non-negative integer",
      );
    }
  }

  private validateEdges(workflow: AutomationWorkflow): void {
    const nodeIds = new Set(workflow.nodes.map((node) => node.id));

    const edgeIds = new Set<string>();

    for (const edge of workflow.edges) {
      if (!edge.id.trim()) {
        throw new Error("Workflow edge id must not be empty");
      }

      if (edgeIds.has(edge.id)) {
        throw new Error(`Duplicate workflow edge id: "${edge.id}"`);
      }

      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source)) {
        throw new Error(
          `Workflow edge "${edge.id}" references unknown source node "${edge.source}"`,
        );
      }

      if (!nodeIds.has(edge.target)) {
        throw new Error(
          `Workflow edge "${edge.id}" references unknown target node "${edge.target}"`,
        );
      }

      if (edge.source === edge.target) {
        throw new Error(
          `Workflow edge "${edge.id}" cannot connect node "${edge.source}" to itself`,
        );
      }
    }
  }

  private validateLinearGraph(workflow: AutomationWorkflow): void {
    if (workflow.nodes.length === 1) {
      if (workflow.edges.length !== 0) {
        throw new Error("A single-node workflow must not contain edges");
      }

      return;
    }

    const incomingCount = new Map<string, number>();
    const outgoingCount = new Map<string, number>();

    for (const node of workflow.nodes) {
      incomingCount.set(node.id, 0);
      outgoingCount.set(node.id, 0);
    }

    for (const edge of workflow.edges) {
      const incoming = (incomingCount.get(edge.target) ?? 0) + 1;

      const outgoing = (outgoingCount.get(edge.source) ?? 0) + 1;

      incomingCount.set(edge.target, incoming);
      outgoingCount.set(edge.source, outgoing);

      if (incoming > 1) {
        throw new Error(
          `Workflow node "${edge.target}" has multiple incoming edges`,
        );
      }

      if (outgoing > 1) {
        throw new Error(
          `Workflow node "${edge.source}" has multiple outgoing edges`,
        );
      }
    }

    const startNodes = workflow.nodes.filter(
      (node) => (incomingCount.get(node.id) ?? 0) === 0,
    );

    const endNodes = workflow.nodes.filter(
      (node) => (outgoingCount.get(node.id) ?? 0) === 0,
    );

    if (startNodes.length !== 1) {
      throw new Error(
        `Workflow must contain exactly one start node, but found ${startNodes.length}`,
      );
    }

    if (endNodes.length !== 1) {
      throw new Error(
        `Workflow must contain exactly one end node, but found ${endNodes.length}`,
      );
    }

    if (workflow.edges.length !== workflow.nodes.length - 1) {
      throw new Error("Workflow must form one connected linear execution path");
    }

    const outgoingTarget = new Map<string, string>();

    for (const edge of workflow.edges) {
      outgoingTarget.set(edge.source, edge.target);
    }

    const visited = new Set<string>();

    let currentNodeId: string | undefined = startNodes[0]?.id;

    while (currentNodeId) {
      if (visited.has(currentNodeId)) {
        throw new Error("Workflow must not contain cycles");
      }

      visited.add(currentNodeId);

      currentNodeId = outgoingTarget.get(currentNodeId);
    }

    if (visited.size !== workflow.nodes.length) {
      throw new Error("Workflow must form one connected linear execution path");
    }
  }
}
