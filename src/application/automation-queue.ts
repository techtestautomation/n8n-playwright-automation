import type {
  AutomationJob,
  AutomationJobStatus,
} from "../domain/automation-job.js";

import type {
  AutomationRunRequest,
  AutomationRunResult,
} from "../domain/automation.js";

export interface AutomationQueue {
  enqueue(request: AutomationRunRequest): Promise<AutomationJob>;

  get(jobId: string): Promise<AutomationJob | undefined>;

  claimNext(): Promise<AutomationJob | undefined>;

  updateStatus(jobId: string, status: AutomationJobStatus): Promise<void>;

  complete(jobId: string, result: AutomationRunResult): Promise<void>;
}
