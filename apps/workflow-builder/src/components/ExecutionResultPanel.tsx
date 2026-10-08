import { useState } from "react";

import type {
  AutomationJob,
  AutomationStepResult,
  FailedAutomationStep,
} from "../workflow-api";
import { getArtifactUrl } from "../workflow-api";

import "./ExecutionResultPanel.css";
import { formatAutomationError } from "../error-formatting";

interface ExecutionResultPanelProps {
  job: AutomationJob;
}

export function ExecutionResultPanel({ job }: ExecutionResultPanelProps) {
  const [previewScreenshot, setPreviewScreenshot] = useState<string>();

  const result = job.result;

  if (!result) {
    return null;
  }

  const attemptedSteps = result.steps.length + (result.failedStep ? 1 : 0);

  const hasArtifacts =
    Boolean(result.artifacts?.trace) || Boolean(result.artifacts?.screenshot);

  return (
    <section className="execution-panel">
      <div className="execution-panel__header">
        <div>
          <h2>Execution Result</h2>
          <span className="execution-panel__job-id">{job.id}</span>
        </div>

        <div
          className={`execution-panel__status execution-panel__status--${result.status}`}
        >
          {result.status === "passed" ? "✓ Passed" : "✕ Failed"}
        </div>
      </div>

      <div className="execution-panel__summary">
        <div>
          <span>Duration</span>
          <strong>{formatDuration(result.durationMs)}</strong>
        </div>

        <div>
          <span>Steps</span>
          <strong>{attemptedSteps}</strong>
        </div>

        <div>
          <span>Retries</span>
          <strong>{job.request?.retries ?? 0}</strong>
        </div>

        <div>
          <span>Trace</span>
          <strong>{result.artifacts?.trace ? "Available" : "None"}</strong>
        </div>
      </div>

      <div className="execution-panel__steps">
        <h3>Steps</h3>

        {result.steps.map((step) => (
          <StepResult key={step.index} step={step} />
        ))}

        {result.failedStep && <FailedStepResult step={result.failedStep} />}
      </div>

      {hasArtifacts && (
        <div className="execution-panel__artifacts">
          <h3>Artifacts</h3>

          {result.artifacts?.trace && (
            <div className="execution-panel__artifact">
              <span>Playwright Trace</span>

              <a
                className="execution-panel__artifact-link"
                href={getArtifactUrl(result.artifacts.trace)}
                download
              >
                Download Trace
              </a>

              <code>{result.artifacts.trace}</code>
            </div>
          )}

          {result.artifacts?.screenshot && (
            <div className="execution-panel__artifact">
              <span>Failure Screenshot</span>

              <button
                type="button"
                className="execution-panel__screenshot-button"
                onClick={() =>
                  setPreviewScreenshot(
                    getArtifactUrl(result.artifacts!.screenshot!),
                  )
                }
              >
                <img
                  className="execution-panel__screenshot"
                  src={getArtifactUrl(result.artifacts.screenshot)}
                  alt="Automation failure screenshot"
                />
              </button>

              <code>{result.artifacts.screenshot}</code>
            </div>
          )}
        </div>
      )}

      {previewScreenshot && (
        <div
          className="screenshot-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Failure screenshot preview"
          onClick={() => setPreviewScreenshot(undefined)}
        >
          <div
            className="screenshot-modal__content"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="screenshot-modal__close"
              aria-label="Close screenshot preview"
              onClick={() => setPreviewScreenshot(undefined)}
            >
              ×
            </button>

            <img
              className="screenshot-modal__image"
              src={previewScreenshot}
              alt="Automation failure screenshot preview"
            />
          </div>
        </div>
      )}
    </section>
  );
}

interface StepResultProps {
  step: AutomationStepResult;
}

function StepResult({ step }: StepResultProps) {
  return (
    <article className="execution-step">
      <div className="execution-step__header">
        <div>
          <strong>✓ Step {step.index + 1}</strong>

          <span className="execution-step__action">{step.action}</span>
        </div>

        <span>{formatDuration(step.durationMs)}</span>
      </div>

      {step.data && Object.keys(step.data).length > 0 && (
        <div className="execution-step__data">
          {Object.entries(step.data).map(([key, value]) => (
            <div key={key} className="execution-step__data-row">
              <span>{formatLabel(key)}</span>

              <code>{formatValue(value)}</code>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

interface FailedStepResultProps {
  step: FailedAutomationStep;
}

function FailedStepResult({ step }: FailedStepResultProps) {
  return (
    <article className="execution-step execution-step--failed">
      <div className="execution-step__header">
        <div>
          <strong>✕ Step {step.index + 1}</strong>

          <span className="execution-step__action">{step.action}</span>
        </div>

        <span>{formatDuration(step.durationMs)}</span>
      </div>

      {(step.locatorRef || step.locator) && (
        <div className="execution-step__data">
          {step.locatorRef && (
            <div className="execution-step__data-row">
              <span>Locator Reference</span>

              <code>{step.locatorRef}</code>
            </div>
          )}

          {step.locator && (
            <div className="execution-step__data-row">
              <span>Locator</span>

              <code>{step.locator}</code>
            </div>
          )}
        </div>
      )}

      <div className="execution-step__error">
        <strong>{step.error.name}</strong>

        <pre className="execution-step__error-message">
          {formatAutomationError(step.error.message)}
        </pre>
      </div>
    </article>
  );
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

function formatLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}
