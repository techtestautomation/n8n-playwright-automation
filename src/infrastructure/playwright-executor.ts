import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import type { AutomationExecutor } from '../application/automation-executor.js';
import type { AutomationRunRequest, AutomationRunResult } from '../domain/automation.js';

export class PlaywrightAutomationExecutor implements AutomationExecutor {
  constructor(
    private readonly artifactDir = process.env.ARTIFACT_DIR ?? './artifacts',
    private readonly headless = process.env.HEADLESS !== 'false'
  ) {}

  async run(request: AutomationRunRequest): Promise<AutomationRunResult> {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    const runId = randomUUID();
    await mkdir(this.artifactDir, { recursive: true });

    const browser = await chromium.launch({ headless: this.headless });
    const context = await browser.newContext();
    const artifacts: AutomationRunResult['artifacts'] = {};

    try {
      if (request.captureTrace) {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      }

      const page = await context.newPage();
      await page.goto(request.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

      if (request.captureScreenshot) {
        const screenshot = resolve(this.artifactDir, `${runId}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        artifacts.screenshot = screenshot;
      }

      if (request.captureTrace) {
        const trace = resolve(this.artifactDir, `${runId}.zip`);
        await context.tracing.stop({ path: trace });
        artifacts.trace = trace;
      }

      return {
        status: 'passed',
        startedAt,
        durationMs: Date.now() - started,
        data: { title: await page.title(), finalUrl: page.url() },
        artifacts
      };
    } catch (error) {
      if (request.captureTrace) {
        const trace = resolve(this.artifactDir, `${runId}-failed.zip`);
        try { await context.tracing.stop({ path: trace }); artifacts.trace = trace; } catch {}
      }
      const normalized = error instanceof Error ? error : new Error(String(error));
      return {
        status: 'failed',
        startedAt,
        durationMs: Date.now() - started,
        artifacts,
        error: { name: normalized.name, message: normalized.message }
      };
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
