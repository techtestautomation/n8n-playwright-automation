import { PlaywrightAutomationExecutor } from './infrastructure/playwright-executor.js';
import { buildApp } from './interfaces/http/app.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const app = buildApp(new PlaywrightAutomationExecutor());

try {
  await app.listen({ port, host });
} catch (error) {
  console.error(error);
  process.exit(1);
}
