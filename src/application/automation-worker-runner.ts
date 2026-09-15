import type { AutomationQueue } from "./automation-queue.js";
import type { AutomationWorker } from "./automation-worker.js";

export class AutomationWorkerRunner {
  private running = false;

  constructor(
    private readonly queue: AutomationQueue,
    private readonly worker: AutomationWorker,
    private readonly pollIntervalMs = 100,
  ) {}

  async runOnce(): Promise<boolean> {
    const job = await this.queue.claimNext();

    if (!job) {
      return false;
    }

    await this.worker.process(job.id);

    return true;
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.running) {
      const processed = await this.runOnce();

      if (!processed && this.running) {
        await this.delay(this.pollIntervalMs);
      }
    }
  }

  stop(): void {
    this.running = false;
  }

  private async delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
}
