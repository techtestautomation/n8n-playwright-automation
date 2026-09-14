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

export class PlaywrightAutomationExecutor implements AutomationExecutor {
  constructor(private readonly locatorRegistry: LocatorRegistry) {}

  private resolveLocator(step: {
    locator?: string;
    locatorRef?: string;
  }): string {
    if (step.locator) {
      return step.locator;
    }

    if (step.locatorRef) {
      return this.locatorRegistry.resolve(step.locatorRef);
    }

    throw new Error("Locator is missing");
  }

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
                  await page.goto(step.url, {
                    waitUntil: "domcontentloaded",
                    timeout: 30_000,
                  });

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                    data: {
                      finalUrl: page.url(),
                      title: await page.title(),
                    },
                  });

                  break;
                }

                case "click": {
                  const locator = this.resolveLocator(step);

                  await page.locator(locator).click();

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                  });

                  break;
                }

                case "fill": {
                  const locator = this.resolveLocator(step);

                  await page.locator(locator).fill(step.value);

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                  });

                  break;
                }

                case "getText": {
                  const locator = this.resolveLocator(step);

                  const text = await page.locator(locator).textContent();

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                    data: {
                      text,
                    },
                  });

                  break;
                }

                case "verifyText": {
                  const locator = this.resolveLocator(step);

                  const actual = await page.locator(locator).textContent();

                  if (actual?.trim() !== step.expected.trim()) {
                    throw new Error(
                      `Text verification failed for "${step.locatorRef ?? step.locator}". ` +
                        `Expected "${step.expected}", but received "${actual?.trim() ?? ""}"`,
                    );
                  }

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                    data: {
                      expected: step.expected,
                      actual: actual?.trim() ?? "",
                    },
                  });

                  break;
                }

                case "waitFor": {
                  const locator = this.resolveLocator(step);

                  await page.locator(locator).waitFor();

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                  });

                  break;
                }

                case "screenshot": {
                  const screenshotPath = path.join(
                    artifactDir,
                    `${runId}-step-${index}.png`,
                  );

                  await page.screenshot({
                    path: screenshotPath,
                    fullPage: true,
                  });

                  stepResults.push({
                    index,
                    action: step.action,
                    status: "passed",
                    durationMs: Date.now() - stepStarted,
                    artifact: screenshotPath,
                  });

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
