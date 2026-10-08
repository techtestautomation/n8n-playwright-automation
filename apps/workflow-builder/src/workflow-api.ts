import type { AutomationWorkflow } from "./workflow-serializer";

export interface QueuedWorkflowResponse {
  jobId: string;
  status: "queued";
}

export type AutomationJobStatus = "queued" | "running" | "completed" | "failed";

export interface AutomationError {
  name: string;
  message: string;
}

export interface AutomationStepResult {
  index: number;
  action: string;
  status: "passed";
  durationMs: number;
  data?: Record<string, unknown>;
}

export interface FailedAutomationStep {
  index: number;
  action: string;
  durationMs: number;
  locatorRef?: string;
  locator?: string;
  error: AutomationError;
}

export interface AutomationArtifacts {
  trace?: string;
  screenshot?: string;
}

export interface AutomationRunResult {
  status: "passed" | "failed";
  startedAt: string;
  durationMs: number;
  steps: AutomationStepResult[];
  failedStep?: FailedAutomationStep;
  artifacts?: AutomationArtifacts;
  error?: AutomationError;
}

export interface AutomationJob {
  id: string;
  status: AutomationJobStatus;

  createdAt: string;
  startedAt?: string;
  completedAt?: string;

  request?: {
    steps: unknown[];
    captureTrace?: boolean;
    retries?: number;
  };

  result?: AutomationRunResult;

  error?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_AUTOMATION_API_URL ?? "http://localhost:3001";

export async function runWorkflow(
  workflow: AutomationWorkflow,
): Promise<QueuedWorkflowResponse> {
  const response = await fetch(`${API_BASE_URL}/automation/workflows/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(workflow),
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(extractErrorMessage(body));
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("jobId" in body) ||
    typeof body.jobId !== "string" ||
    !("status" in body) ||
    body.status !== "queued"
  ) {
    throw new Error("Unexpected workflow API response");
  }

  return {
    jobId: body.jobId,
    status: body.status,
  };
}

export async function getAutomationJob(jobId: string): Promise<AutomationJob> {
  const response = await fetch(`${API_BASE_URL}/automation/jobs/${jobId}`);

  const body: unknown = await response.json();

  if (!response.ok) {
    throw new Error(extractErrorMessage(body));
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "string" ||
    !("status" in body) ||
    !isAutomationJobStatus(body.status)
  ) {
    throw new Error("Unexpected automation job response");
  }

  return body as unknown as AutomationJob;
}

function isAutomationJobStatus(value: unknown): value is AutomationJobStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  );
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    if (typeof body.error === "string") {
      return body.error;
    }

    if (
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
    ) {
      return body.error.message;
    }
  }

  return "Workflow execution request failed";
}

export function getArtifactUrl(artifactPath: string): string {
  const filename = artifactPath.split("/").pop();

  if (!filename) {
    throw new Error(`Invalid artifact path: ${artifactPath}`);
  }

  return `${API_BASE_URL}/automation/artifacts/${encodeURIComponent(filename)}`;
}
