import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
  FillAction,
} from "../domain/automation.js";
import { PlaywrightLocatorResolver } from "./playwright-locator-resolver.js";

export class PlaywrightFillActionExecutor implements ActionExecutor {
  constructor(
    private readonly page: Page,
    private readonly locatorResolver: PlaywrightLocatorResolver,
  ) {}

  supports(action: AutomationAction): boolean {
    return action.action === "fill";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightFillActionExecutor does not support action "${action.action}"`,
      );
    }

    const fillAction = action as FillAction;
    const startedAt = Date.now();

    const locator = this.locatorResolver.resolve(fillAction);

    await this.page.locator(locator).fill(fillAction.value);

    return {
      index: context.stepIndex,
      action: "fill",
      status: "passed",
      durationMs: Date.now() - startedAt,
    };
  }
}
