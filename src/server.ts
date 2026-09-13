import { buildApp } from './interfaces/http/app.js';
import { JsonLocatorRegistry } from './infrastructure/json-locator-registry.js';
import { PlaywrightAutomationExecutor } from './infrastructure/playwright-executor.js';

const locatorRegistry = new JsonLocatorRegistry();

const executor = new PlaywrightAutomationExecutor(locatorRegistry);

const app = buildApp(executor);

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

await app.listen({
  port,
  host,
});