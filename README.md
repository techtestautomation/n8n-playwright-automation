# n8n + Playwright Automation

A portfolio-grade browser automation execution service that lets **n8n orchestrate workflows** while **Playwright owns browser execution**.

## Increment 1 — Browser Execution API

This first increment establishes the execution boundary:

- TypeScript service
- Fastify HTTP API
- Playwright Chromium executor
- `GET /health`
- `POST /automation/run`
- input validation
- structured pass/fail responses
- optional screenshots and Playwright traces
- Docker Compose with n8n + browser API
- tests and GitHub Actions CI

## Architecture

```text
n8n workflow
    |
    | HTTP POST /automation/run
    v
Fastify API
    |
    v
Playwright Executor
    |
    v
Chromium -> target web application
    |
    v
JSON result + screenshot/trace artifacts
```

n8n stays focused on orchestration, integrations and business logic. The Playwright service owns browser lifecycle, navigation, evidence capture and future test-automation capabilities.

## API

### Health

```bash
curl http://localhost:3001/health
```

### Run browser automation

```bash
curl -X POST http://localhost:3001/automation/run \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://example.com",
    "captureScreenshot": true,
    "captureTrace": true
  }'
```

Example response:

```json
{
  "status": "passed",
  "startedAt": "2026-09-13T10:00:00.000Z",
  "durationMs": 728,
  "data": {
    "title": "Example Domain",
    "finalUrl": "https://example.com/"
  },
  "artifacts": {
    "screenshot": "/app/artifacts/<run-id>.png",
    "trace": "/app/artifacts/<run-id>.zip"
  }
}
```

## Local development

Requirements: Node.js 22+ and Chromium installed by Playwright.

```bash
npm install
npx playwright install chromium
npm run check
npm run dev
```

Then open n8n at `http://localhost:5678` when using Docker Compose.

## Docker

```bash
docker compose up --build
```

Services:

- n8n: `http://localhost:5678`
- Playwright API: `http://localhost:3001`

## Roadmap

**Increment 2:** reusable actions (`navigate`, `click`, `fill`, `getText`, `wait`, `screenshot`) and an n8n sample workflow.

**Increment 3:** retries, richer artifact handling, execution correlation and error diagnostics.

**Later:** queues, parallel workers, reusable workflows, credential handling and AI-assisted self-healing.

## Why this project?

Many low-code automations eventually encounter a website with no suitable API. This project demonstrates a clean architecture for combining n8n's visual orchestration with a dedicated TypeScript/Playwright browser execution layer instead of embedding fragile browser scripts directly in workflow nodes.

## License

MIT

## Verification

Increment 1 is designed to be verified with:

```bash
npm run typecheck
npm test
npm run build
npm run test:browser
```

The browser smoke test proves Chromium can launch, render content and capture an artifact. GitHub Actions repeats the Node quality gate on every push and pull request.
