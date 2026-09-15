import type {
  AutomationRunRequest,
  AutomationRunResult,
} from "./automation.js";

export type AutomationJobStatus = "queued" | "running" | "completed" | "failed";

export interface AutomationJob {
  id: string;
  status: AutomationJobStatus;
  request: AutomationRunRequest;
  result?: AutomationRunResult;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
