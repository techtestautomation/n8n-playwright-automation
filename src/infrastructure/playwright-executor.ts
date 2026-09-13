import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { chromium } from 'playwright';

import type { AutomationExecutor } from '../application/automation-executor.js';
import type { LocatorRegistry } from '../application/locator-registry.js';
import type {
  AutomationRunRequest,
  AutomationRunResult,
  AutomationStepResult,
} from '../domain/automation.js';

export class PlaywrightAutomationExecutor implements AutomationExecutor {
  constructor(private readonly locatorRegistry: LocatorRegistry) {}

  private resolveLocator(
    step: { locator?: string; locatorRef?: string },
  ): string {
    if (step.locator) {
      return step.locator;
    }

    if (step.locatorRef) {
      return this.locatorRegistry.resolve(step.locatorRef);
    }

    throw new Error('Locator is missing');
  }

  async run(request: AutomationRunRequest): Promise<AutomationRunResult> {
    const startedAt = new Date().toISOString();
    const started = Date.now();

    const artifactDir = process.env.ARTIFACT_DIR ?? './artifacts';
    const runId = randomUUID();

    await mkdir(artifactDir, { recursive: true });

    const browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
    });

    const context = await browser.newContext();

    let traceStarted = false;

    try {
      if (request.captureTrace) {
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });

        traceStarted = true;
      }

      const page = await context.newPage();

      const stepResults: AutomationStepResult[] = [];

      for (const [index, step] of request.steps.entries()) {
        const stepStarted = Date.now();

        switch (step.action) {
          case 'navigate': {
            await page.goto(step.url, {
              waitUntil: 'domcontentloaded',
              timeout: 30_000,
            });

            stepResults.push({
              index,
              action: step.action,
              status: 'passed',
              durationMs: Date.now() - stepStarted,
              data: {
                finalUrl: page.url(),
                title: await page.title(),
              },
            });
            break;
          }

          case 'click': {
            const locator = this.resolveLocator(step);

            await page.locator(locator).click();

            stepResults.push({
              index,
              action: step.action,
              status: 'passed',
              durationMs: Date.now() - stepStarted,
            });
            break;
          }
          
          case 'fill': {
            const locator = this.resolveLocator(step);

            await page.locator(locator).fill(step.value);

            stepResults.push({
              index,
              action: step.action,
              status: 'passed',
              durationMs: Date.now() - stepStarted,
            });
            break;
          }

          case 'getText': {
            const locator = this.resolveLocator(step);
            const text = await page.locator(locator).textContent();

            stepResults.push({
              index,
              action: step.action,
              status: 'passed',
              durationMs: Date.now() - stepStarted,
              data: {
                text,
              },
            });
            break;
          }

          case 'waitFor': {
            const locator = this.resolveLocator(step);
            await page.locator(locator).waitFor();

            stepResults.push({
              index,
              action: step.action,
              status: 'passed',
              durationMs: Date.now() - stepStarted,
            });
            break;
          }

          case 'screenshot': {
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
              status: 'passed',
              durationMs: Date.now() - stepStarted,
              artifact: screenshotPath,
            });
            break;
          }
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
        status: 'passed',
        startedAt,
        durationMs: Date.now() - started,
        steps: stepResults,
        artifacts: {
          trace: tracePath,
        },
      };
    } catch (error) {
      let tracePath: string | undefined;

      if (traceStarted) {
        tracePath = path.join(artifactDir, `${runId}-failed.zip`);

        try {
          await context.tracing.stop({
            path: tracePath,
          });
        } catch {
          // Ignore trace failure so original automation error is preserved.
        }
      }

      return {
        status: 'failed',
        startedAt,
        durationMs: Date.now() - started,
        artifacts: {
          trace: tracePath,
        },
        error: {
          name: error instanceof Error ? error.name : 'Error',
          message:
            error instanceof Error
              ? error.message
              : 'Unknown automation error',
        },
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}