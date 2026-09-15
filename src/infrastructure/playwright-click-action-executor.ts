import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
  ClickAction,
} from "../domain/automation.js";
import { PlaywrightLocatorResolver } from "./playwright-locator-resolver.js";

export class PlaywrightClickActionExecutor implements ActionExecutor {
  constructor(
    private readonly page: Page,
    private readonly locatorResolver: PlaywrightLocatorResolver,
  ) {}

  supports(action: AutomationAction): boolean {
    return action.action === "click";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightClickActionExecutor does not support action "${action.action}"`,
      );
    }

    const clickAction = action as ClickAction;
    const startedAt = Date.now();

    const locator = this.locatorResolver.resolve(clickAction);

    await this.page.locator(locator).click();

    return {
      index: context.stepIndex,
      action: "click",
      status: "passed",
      durationMs: Date.now() - startedAt,
    };
  }
}
