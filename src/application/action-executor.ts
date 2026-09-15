import type {
  AutomationAction,
  AutomationStepResult,
} from "../domain/automation.js";

export interface ActionExecutionContext {
  stepIndex: number;
  artifactDir?: string;
  runId?: string;
}

export interface ActionExecutor {
  supports(action: AutomationAction): boolean;

  execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult>;
}
