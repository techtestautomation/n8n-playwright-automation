import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Page } from "playwright";

import type { AutomationExecutor } from "../application/automation-executor.js";
import type { LocatorRegistry } from "../application/locator-registry.js";
import type {
  AutomationAction,
  AutomationRunRequest,
  AutomationRunResult,
  AutomationStepResult,
} from "../domain/automation.js";
import { PlaywrightNavigateActionExecutor } from "./playwright-navigate-action-executor.js";
import { PlaywrightClickActionExecutor } from "./playwright-click-action-executor.js";
import { PlaywrightLocatorResolver } from "./playwright-locator-resolver.js";
import { PlaywrightFillActionExecutor } from "./playwright-fill-action-executor.js";
import { PlaywrightGetTextActionExecutor } from "./playwright-get-text-action-executor.js";
import { PlaywrightVerifyTextActionExecutor } from "./playwright-verify-text-action-executor.js";
import { PlaywrightWaitForActionExecutor } from "./playwright-wait-for-action-executor.js";
import { PlaywrightScreenshotActionExecutor } from "./playwright-screenshot-action-executor.js";

export class PlaywrightAutomationExecutor implements AutomationExecutor {
  constructor(private readonly locatorRegistry: LocatorRegistry) {}

  private isRetryableAction(action: AutomationAction["action"]): boolean {
    return (
      action === "click" ||
      action === "waitFor" ||
      action === "getText" ||
      action === "verifyText"
    );
  }

  async run(request: AutomationRunRequest): Promise<AutomationRunResult> {
    const startedAt = new Date().toISOString();
    const started = Date.now();

    const artifactDir = process.env.ARTIFACT_DIR ?? "./artifacts";

    const runId = randomUUID();

    await mkdir(artifactDir, {
      recursive: true,
    });

    const browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
    });

    const context = await browser.newContext();

    let traceStarted = false;
    let failedStep: AutomationRunResult["failedStep"];
    let failureScreenshotPath: string | undefined;
    let page: Page | undefined;

    const stepResults: AutomationStepResult[] = [];

    try {
      if (request.captureTrace) {
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });

        traceStarted = true;
      }

      page = await context.newPage();

      const navigateActionExecutor = new PlaywrightNavigateActionExecutor(page);

      const locatorResolver = new PlaywrightLocatorResolver(
        this.locatorRegistry,
      );

      const clickActionExecutor = new PlaywrightClickActionExecutor(
        page,
        locatorResolver,
      );

      const fillActionExecutor = new PlaywrightFillActionExecutor(
        page,
        locatorResolver,
      );
      const getTextActionExecutor = new PlaywrightGetTextActionExecutor(
        page,
        locatorResolver,
      );

      const waitForActionExecutor = new PlaywrightWaitForActionExecutor(
        page,
        locatorResolver,
      );

      const verifyTextActionExecutor = new PlaywrightVerifyTextActionExecutor(
        page,
        locatorResolver,
      );

      const screenshotActionExecutor = new PlaywrightScreenshotActionExecutor(
        page,
      );

      for (const [index, step] of request.steps.entries()) {
        const stepStarted = Date.now();

        try {
          const maxAttempts = this.isRetryableAction(step.action)
            ? (request.retries ?? 0) + 1
            : 1;

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              switch (step.action) {
                case "navigate": {
                  const result = await navigateActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "click": {
                  const result = await clickActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "fill": {
                  const result = await fillActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "getText": {
                  const result = await getTextActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "verifyText": {
                  const result = await verifyTextActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "waitFor": {
                  const result = await waitForActionExecutor.execute(step, {
                    stepIndex: index,
                  });

                  stepResults.push(result);

                  break;
                }

                case "screenshot": {
                  const result = await screenshotActionExecutor.execute(step, {
                    stepIndex: index,
                    artifactDir,
                    runId,
                  });

                  stepResults.push(result);

                  break;
                }
              }

              // Step succeeded, so no further attempts are needed.
              break;
            } catch (error) {
              if (attempt === maxAttempts) {
                throw error;
              }
              await new Promise((resolve) => {
                setTimeout(resolve, 100);
              });
            }
          }
        } catch (error) {
          failedStep = {
            index,
            action: step.action,
            durationMs: Date.now() - stepStarted,
            ...("locator" in step && step.locator
              ? {
                  locator: step.locator,
                }
              : {}),
            ...("locatorRef" in step && step.locatorRef
              ? {
                  locatorRef: step.locatorRef,
                }
              : {}),
            error: {
              name: error instanceof Error ? error.name : "Error",
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown automation error",
            },
          };

          throw error;
        }
      }

      let tracePath: string | undefined;

      if (traceStarted) {
        tracePath = path.join(artifactDir, `${runId}.zip`);

        await context.tracing.stop({
          path: tracePath,
        });

        traceStarted = false;
      }

      return {
        status: "passed",
        startedAt,
        durationMs: Date.now() - started,
        steps: stepResults,
        artifacts: {
          trace: tracePath,
        },
      };
    } catch (error) {
      if (page) {
        failureScreenshotPath = path.join(artifactDir, `${runId}-failed.png`);

        try {
          await page.screenshot({
            path: failureScreenshotPath,
            fullPage: true,
          });
        } catch {
          failureScreenshotPath = undefined;

          // Preserve the original automation error.
        }
      }

      let tracePath: string | undefined;

      if (traceStarted) {
        tracePath = path.join(artifactDir, `${runId}-failed.zip`);

        try {
          await context.tracing.stop({
            path: tracePath,
          });

          traceStarted = false;
        } catch {
          // Preserve the original automation error.
        }
      }

      return {
        status: "failed",
        startedAt,
        durationMs: Date.now() - started,
        steps: stepResults,
        failedStep,
        artifacts: {
          trace: tracePath,
          screenshot: failureScreenshotPath,
        },
        error: {
          name: error instanceof Error ? error.name : "Error",
          message:
            error instanceof Error ? error.message : "Unknown automation error",
        },
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
