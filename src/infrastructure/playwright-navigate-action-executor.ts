import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
  NavigateAction,
} from "../domain/automation.js";

export class PlaywrightNavigateActionExecutor implements ActionExecutor {
  constructor(private readonly page: Page) {}

  supports(action: AutomationAction): boolean {
    return action.action === "navigate";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightNavigateActionExecutor does not support action "${action.action}"`,
      );
    }

    const navigateAction = action as NavigateAction;
    const startedAt = Date.now();

    await this.page.goto(navigateAction.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    return {
      index: context.stepIndex,
      action: "navigate",
      status: "passed",
      durationMs: Date.now() - startedAt,
      data: {
        finalUrl: this.page.url(),
        title: await this.page.title(),
      },
    };
  }
}
