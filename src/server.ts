import { AutomationWorkerRunner } from "./application/automation-worker-runner.js";
import { ScriptParser } from "./application/script-parser.js";
import { DefaultAutomationWorker } from "./infrastructure/automation-worker.js";
import { InMemoryAutomationQueue } from "./infrastructure/in-memory-automation-queue.js";
import { JsonLocatorRegistry } from "./infrastructure/json-locator-registry.js";
import { PlaywrightAutomationExecutor } from "./infrastructure/playwright-executor.js";
import { buildApp } from "./interfaces/http/app.js";

const locatorRegistry = new JsonLocatorRegistry();

const executor = new PlaywrightAutomationExecutor(locatorRegistry);

const scriptParser = new ScriptParser();

const queue = new InMemoryAutomationQueue();

const worker = new DefaultAutomationWorker(queue, executor);

const workerRunner = new AutomationWorkerRunner(queue, worker);

const app = buildApp(executor, scriptParser, queue);

const workerRunnerPromise = workerRunner.start();

app.addHook("onClose", async () => {
  workerRunner.stop();
  await workerRunnerPromise;
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({
  port,
  host,
});
