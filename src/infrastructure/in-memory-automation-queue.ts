import { randomUUID } from "node:crypto";

import type { AutomationQueue } from "../application/automation-queue.js";
import type {
  AutomationJob,
  AutomationJobStatus,
} from "../domain/automation-job.js";
import type {
  AutomationRunRequest,
  AutomationRunResult,
} from "../domain/automation.js";

export class InMemoryAutomationQueue implements AutomationQueue {
  private readonly jobs = new Map<string, AutomationJob>();

  async enqueue(request: AutomationRunRequest): Promise<AutomationJob> {
    const job: AutomationJob = {
      id: randomUUID(),
      status: "queued",
      request,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(job.id, job);

    return job;
  }

  async get(jobId: string): Promise<AutomationJob | undefined> {
    return this.jobs.get(jobId);
  }

  async claimNext(): Promise<AutomationJob | undefined> {
    for (const job of this.jobs.values()) {
      if (job.status === "queued") {
        job.status = "running";
        job.startedAt = new Date().toISOString();

        return job;
      }
    }

    return undefined;
  }

  async updateStatus(
    jobId: string,
    status: AutomationJobStatus,
  ): Promise<void> {
    const job = this.requireJob(jobId);

    job.status = status;

    if (status === "running" && !job.startedAt) {
      job.startedAt = new Date().toISOString();
    }
  }

  async complete(jobId: string, result: AutomationRunResult): Promise<void> {
    const job = this.requireJob(jobId);

    job.result = result;
    job.status = result.status === "passed" ? "completed" : "failed";
    job.completedAt = new Date().toISOString();
  }

  private requireJob(jobId: string): AutomationJob {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Automation job "${jobId}" was not found`);
    }

    return job;
  }
}
