import type {
  AutomationRunRequest,
  AutomationRunResult,
} from "../domain/automation.js";

export interface AutomationExecutor {
  run(request: AutomationRunRequest): Promise<AutomationRunResult>;
}
