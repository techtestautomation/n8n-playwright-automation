import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
  VerifyTextAction,
} from "../domain/automation.js";
import { PlaywrightLocatorResolver } from "./playwright-locator-resolver.js";

export class PlaywrightVerifyTextActionExecutor implements ActionExecutor {
  constructor(
    private readonly page: Page,
    private readonly locatorResolver: PlaywrightLocatorResolver,
  ) {}

  supports(action: AutomationAction): boolean {
    return action.action === "verifyText";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightVerifyTextActionExecutor does not support action "${action.action}"`,
      );
    }

    const verifyTextAction = action as VerifyTextAction;

    const startedAt = Date.now();

    const locator = this.locatorResolver.resolve(verifyTextAction);

    const actual = await this.page.locator(locator).textContent();

    if (actual?.trim() !== verifyTextAction.expected.trim()) {
      throw new Error(
        `Text verification failed for "${
          verifyTextAction.locatorRef ?? verifyTextAction.locator
        }". ` +
          `Expected "${verifyTextAction.expected}", but received "${actual?.trim() ?? ""}"`,
      );
    }

    return {
      index: context.stepIndex,
      action: "verifyText",
      status: "passed",
      durationMs: Date.now() - startedAt,
      data: {
        expected: verifyTextAction.expected,
        actual: actual?.trim() ?? "",
      },
    };
  }
}
