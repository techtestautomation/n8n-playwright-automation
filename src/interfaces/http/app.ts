import Fastify from "fastify";

import type { AutomationExecutor } from "../../application/automation-executor.js";
import { ScriptParser } from "../../application/script-parser.js";
import { validateAutomationRequest } from "../../domain/automation.js";

export function buildApp(
  executor: AutomationExecutor,
  scriptParser: ScriptParser,
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

  return app;
}
