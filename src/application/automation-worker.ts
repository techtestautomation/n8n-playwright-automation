export interface AutomationWorker {
  process(jobId: string): Promise<void>;
}
