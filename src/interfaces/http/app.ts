import Fastify from "fastify";

import type { AutomationExecutor } from "../../application/automation-executor.js";
import { ScriptParser } from "../../application/script-parser.js";
import { validateAutomationRequest } from "../../domain/automation.js";
import type { AutomationQueue } from "../../application/automation-queue.js";

export function buildApp(
  executor: AutomationExecutor,
  scriptParser: ScriptParser,
  queue?: AutomationQueue,
) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "n8n-playwright-automation",
    version: "0.1.0",
  }));

  app.post<{ Body: unknown }>("/automation/run", async (request, reply) => {
    try {
      const input = validateAutomationRequest(request.body);
      const result = await executor.run(input);

      return reply.code(result.status === "passed" ? 200 : 502).send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return reply.code(400).send({
        status: "failed",
        error: {
          name: "ValidationError",
          message,
        },
      });
    }
  });

  app.post<{ Body: unknown }>(
    "/automation/run-script",
    async (request, reply) => {
      try {
        const body = request.body;

        if (
          typeof body !== "object" ||
          body === null ||
          !("script" in body) ||
          typeof body.script !== "string"
        ) {
          throw new Error("script must be a string");
        }

        const input = scriptParser.parse(body.script);
        const result = await executor.run(input);

        return reply.code(result.status === "passed" ? 200 : 502).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        return reply.code(400).send({
          status: "failed",
          error: {
            name: "ValidationError",
            message,
          },
        });
      }
    },
  );

  app.post<{ Body: unknown }>("/automation/jobs", async (request, reply) => {
    if (!queue) {
      return reply.code(503).send({
        status: "failed",
        error: {
          name: "ServiceUnavailableError",
          message: "Automation queue is not configured",
        },
      });
    }

    try {
      const input = validateAutomationRequest(request.body);
      const job = await queue.enqueue(input);

      return reply.code(202).send({
        jobId: job.id,
        status: job.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return reply.code(400).send({
        status: "failed",
        error: {
          name: "ValidationError",
          message,
        },
      });
    }
  });

  app.get<{ Params: { jobId: string } }>(
    "/automation/jobs/:jobId",
    async (request, reply) => {
      if (!queue) {
        return reply.code(503).send({
          status: "failed",
          error: {
            name: "ServiceUnavailableError",
            message: "Automation queue is not configured",
          },
        });
      }

      const job = await queue.get(request.params.jobId);

      if (!job) {
        return reply.code(404).send({
          status: "failed",
          error: {
            name: "NotFoundError",
            message: `Automation job "${request.params.jobId}" was not found`,
          },
        });
      }

      return reply.code(200).send(job);
    },
  );

  return app;
}
