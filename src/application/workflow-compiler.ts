import type {
  AutomationAction,
  AutomationRunRequest,
} from "../domain/automation.js";
import type { AutomationWorkflow, WorkflowNode } from "../domain/workflow.js";
import { WorkflowValidator } from "./workflow-validator.js";

export class WorkflowCompiler {
  constructor(private readonly validator: WorkflowValidator) {}

  compile(workflow: AutomationWorkflow): AutomationRunRequest {
    this.validator.validate(workflow);

    const orderedNodes = this.orderNodes(workflow);

    return {
      steps: orderedNodes.map((node) => this.compileNode(node)),
      captureTrace: workflow.settings.captureTrace,
      retries: workflow.settings.retries,
    };
  }

  private orderNodes(workflow: AutomationWorkflow): WorkflowNode[] {
    if (workflow.nodes.length === 1) {
      return [workflow.nodes[0]!];
    }

    const incomingNodeIds = new Set(workflow.edges.map((edge) => edge.target));

    const startNode = workflow.nodes.find(
      (node) => !incomingNodeIds.has(node.id),
    );

    if (!startNode) {
      throw new Error("Workflow start node could not be determined");
    }

    const nodesById = new Map(workflow.nodes.map((node) => [node.id, node]));

    const nextNodeById = new Map(
      workflow.edges.map((edge) => [edge.source, edge.target]),
    );

    const orderedNodes: WorkflowNode[] = [];

    let currentNode: WorkflowNode | undefined = startNode;

    while (currentNode) {
      orderedNodes.push(currentNode);

      const nextNodeId = nextNodeById.get(currentNode.id);

      if (!nextNodeId) {
        break;
      }

      currentNode = nodesById.get(nextNodeId);
    }

    return orderedNodes;
  }

  private compileNode(node: WorkflowNode): AutomationAction {
    switch (node.type) {
      case "navigate":
        return {
          action: "navigate",
          url: node.config.url,
        };

      case "fill":
        return {
          action: "fill",
          locatorRef: node.config.locatorRef,
          value: node.config.value,
        };

      case "click":
        return {
          action: "click",
          locatorRef: node.config.locatorRef,
        };

      case "getText":
        return {
          action: "getText",
          locatorRef: node.config.locatorRef,
        };

      case "waitFor":
        return {
          action: "waitFor",
          locatorRef: node.config.locatorRef,
        };

      case "verifyText":
        return {
          action: "verifyText",
          locatorRef: node.config.locatorRef,
          expected: node.config.expected,
        };

      case "screenshot":
        return {
          action: "screenshot",
        };
    }
  }
}
