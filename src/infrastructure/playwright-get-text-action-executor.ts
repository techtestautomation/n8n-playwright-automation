import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
  GetTextAction,
} from "../domain/automation.js";
import { PlaywrightLocatorResolver } from "./playwright-locator-resolver.js";

export class PlaywrightGetTextActionExecutor implements ActionExecutor {
  constructor(
    private readonly page: Page,
    private readonly locatorResolver: PlaywrightLocatorResolver,
  ) {}

  supports(action: AutomationAction): boolean {
    return action.action === "getText";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightGetTextActionExecutor does not support action "${action.action}"`,
      );
    }

    const getTextAction = action as GetTextAction;
    const startedAt = Date.now();

    const locator = this.locatorResolver.resolve(getTextAction);

    const text = await this.page.locator(locator).textContent();

    return {
      index: context.stepIndex,
      action: "getText",
      status: "passed",
      durationMs: Date.now() - startedAt,
      data: {
        text,
      },
    };
  }
}
