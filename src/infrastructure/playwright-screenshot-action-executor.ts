import path from "node:path";

import type { Page } from "playwright";

import type {
  ActionExecutionContext,
  ActionExecutor,
} from "../application/action-executor.js";
import type {
  AutomationAction,
  AutomationStepResult,
} from "../domain/automation.js";

export class PlaywrightScreenshotActionExecutor implements ActionExecutor {
  constructor(private readonly page: Page) {}

  supports(action: AutomationAction): boolean {
    return action.action === "screenshot";
  }

  async execute(
    action: AutomationAction,
    context: ActionExecutionContext,
  ): Promise<AutomationStepResult> {
    if (!this.supports(action)) {
      throw new Error(
        `PlaywrightScreenshotActionExecutor does not support action "${action.action}"`,
      );
    }

    if (!context.artifactDir) {
      throw new Error("artifactDir is required for screenshot actions");
    }

    if (!context.runId) {
      throw new Error("runId is required for screenshot actions");
    }

    const startedAt = Date.now();

    const screenshotPath = path.join(
      context.artifactDir,
      `${context.runId}-step-${context.stepIndex}.png`,
    );

    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });

    return {
      index: context.stepIndex,
      action: "screenshot",
      status: "passed",
      durationMs: Date.now() - startedAt,
      artifact: screenshotPath,
    };
  }
}
