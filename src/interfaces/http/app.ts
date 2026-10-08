import Fastify from "fastify";

import type { AutomationExecutor } from "../../application/automation-executor.js";
import { ScriptParser } from "../../application/script-parser.js";
import { validateAutomationRequest } from "../../domain/automation.js";
import type { AutomationQueue } from "../../application/automation-queue.js";
import type { WorkflowCompiler } from "../../application/workflow-compiler.js";
import type { AutomationWorkflow } from "../../domain/workflow.js";
import cors from "@fastify/cors";
import path from "node:path";
import { readFile } from "node:fs/promises";

export function buildApp(
  executor: AutomationExecutor,
  scriptParser: ScriptParser,
  queue?: AutomationQueue,
  workflowCompiler?: WorkflowCompiler,
) {
  const app = Fastify({ logger: true });

  void app.register(cors, {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
  });

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

  app.post<{ Body: unknown }>(
    "/automation/workflows/run",
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

      if (!workflowCompiler) {
        return reply.code(503).send({
          status: "failed",
          error: {
            name: "ServiceUnavailableError",
            message: "Workflow compiler is not configured",
          },
        });
      }

      try {
        const workflow = request.body as AutomationWorkflow;

        const input = workflowCompiler.compile(workflow);

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
    },
  );

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

  app.get<{
    Params: {
      filename: string;
    };
  }>("/automation/artifacts/:filename", async (request, reply) => {
    const artifactDir = process.env.ARTIFACT_DIR ?? "./artifacts";

    const artifactRoot = path.resolve(artifactDir);
    const artifactPath = path.resolve(artifactRoot, request.params.filename);

    const relativePath = path.relative(artifactRoot, artifactPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return reply.code(400).send({
        status: "failed",
        error: {
          name: "ValidationError",
          message: "Invalid artifact path",
        },
      });
    }

    try {
      const artifact = await readFile(artifactPath);

      const extension = path.extname(artifactPath).toLowerCase();

      const contentType =
        extension === ".png"
          ? "image/png"
          : extension === ".zip"
            ? "application/zip"
            : "application/octet-stream";

      return reply.type(contentType).send(artifact);
    } catch (error) {
      const isNotFound =
        error instanceof Error && "code" in error && error.code === "ENOENT";

      if (isNotFound) {
        return reply.code(404).send({
          status: "failed",
          error: {
            name: "NotFoundError",
            message: `Artifact "${request.params.filename}" was not found`,
          },
        });
      }

      throw error;
    }
  });

  return app;
}
