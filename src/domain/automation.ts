export type AutomationStatus = 'passed' | 'failed';

export interface AutomationRunRequest {
  url: string;
  captureScreenshot?: boolean;
  captureTrace?: boolean;
}

export interface AutomationArtifacts {
  screenshot?: string;
  trace?: string;
}

export interface AutomationRunResult {
  status: AutomationStatus;
  startedAt: string;
  durationMs: number;
  data?: {
    title: string;
    finalUrl: string;
  };
  artifacts: AutomationArtifacts;
  error?: {
    name: string;
    message: string;
  };
}

export function validateAutomationRequest(input: unknown): AutomationRunRequest {
  if (!input || typeof input !== 'object') throw new Error('Request body must be an object');
  const value = input as Record<string, unknown>;
  if (typeof value.url !== 'string' || value.url.trim() === '') throw new Error('url is required');

  let parsed: URL;
  try { parsed = new URL(value.url); } catch { throw new Error('url must be a valid URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('url must use http or https');

  return {
    url: parsed.toString(),
    captureScreenshot: value.captureScreenshot === true,
    captureTrace: value.captureTrace === true
  };
}
