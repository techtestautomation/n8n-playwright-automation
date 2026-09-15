import type { AutomationExecutor } from "../application/automation-executor.js";
import type { AutomationQueue } from "../application/automation-queue.js";
import type { AutomationWorker } from "../application/automation-worker.js";

export class DefaultAutomationWorker implements AutomationWorker {
  constructor(
    private readonly queue: AutomationQueue,
    private readonly executor: AutomationExecutor,
  ) {}

  async process(jobId: string): Promise<void> {
    const job = await this.queue.get(jobId);

    if (!job) {
      throw new Error(`Automation job "${jobId}" was not found`);
    }

    const result = await this.executor.run(job.request);

    await this.queue.complete(jobId, result);
  }
}
