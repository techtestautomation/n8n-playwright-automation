export type LocatorTarget =
  | {
      locator: string;
      locatorRef?: never;
    }
  | {
      locatorRef: string;
      locator?: never;
    };

export interface NavigateAction {
  action: "navigate";
  url: string;
}

export type ClickAction = {
  action: "click";
} & LocatorTarget;

export type FillAction = {
  action: "fill";
  value: string;
} & LocatorTarget;

export type GetTextAction = {
  action: "getText";
} & LocatorTarget;

export type WaitForAction = {
  action: "waitFor";
} & LocatorTarget;

export type VerifyTextAction = {
  action: "verifyText";
  expected: string;
} & LocatorTarget;

export interface ScreenshotAction {
  action: "screenshot";
}

export type AutomationAction =
  | NavigateAction
  | ClickAction
  | FillAction
  | GetTextAction
  | WaitForAction
  | VerifyTextAction
  | ScreenshotAction;

export type AutomationStatus = "passed" | "failed";

export interface AutomationRunRequest {
  steps: AutomationAction[];
  captureTrace?: boolean;
}

export interface AutomationArtifacts {
  screenshot?: string;
  trace?: string;
}

export interface AutomationStepResult {
  index: number;
  action: AutomationAction["action"];
  status: "passed";
  durationMs: number;
  data?: Record<string, unknown>;
  artifact?: string;
}

export interface AutomationRunResult {
  status: AutomationStatus;
  startedAt: string;
  durationMs: number;
  steps?: AutomationStepResult[];
  artifacts: {
    trace?: string;
  };

  error?: {
    name: string;
    message: string;
  };
}

function validateLocatorTarget(
  step: Record<string, unknown>,
  index: number,
): LocatorTarget {
  const hasLocator =
    typeof step.locator === "string" && step.locator.trim() !== "";

  const hasLocatorRef =
    typeof step.locatorRef === "string" && step.locatorRef.trim() !== "";

  if (hasLocator === hasLocatorRef) {
    throw new Error(
      `steps[${index}] must specify exactly one of locator or locatorRef`,
    );
  }

  if (hasLocator) {
    return {
      locator: step.locator as string,
    };
  }

  return {
    locatorRef: step.locatorRef as string,
  };
}

export function validateAutomationRequest(
  input: unknown,
): AutomationRunRequest {
  if (typeof input !== "object" || input === null) {
    throw new Error("Request body must be an object");
  }

  const body = input as Record<string, unknown>;

  if (!Array.isArray(body.steps)) {
    throw new Error("steps must be an array");
  }

  if (body.steps.length === 0) {
    throw new Error("steps must contain at least one action");
  }

  const steps = body.steps.map((rawStep, index): AutomationAction => {
    if (typeof rawStep !== "object" || rawStep === null) {
      throw new Error(`steps[${index}] must be an object`);
    }

    const step = rawStep as Record<string, unknown>;

    if (typeof step.action !== "string") {
      throw new Error(`steps[${index}].action is required`);
    }

    switch (step.action) {
      case "navigate": {
        if (typeof step.url !== "string" || step.url.trim() === "") {
          throw new Error(`steps[${index}].url is required`);
        }

        let parsedUrl: URL;

        try {
          parsedUrl = new URL(step.url);
        } catch {
          throw new Error(`steps[${index}].url must be a valid URL`);
        }

        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error(`steps[${index}].url must use http or https`);
        }

        return {
          action: "navigate",
          url: parsedUrl.toString(),
        };
      }

      case "click": {
        return {
          action: "click",
          ...validateLocatorTarget(step, index),
        };
      }

      case "fill": {
        if (typeof step.value !== "string") {
          throw new Error(`steps[${index}].value is required`);
        }

        return {
          action: "fill",
          value: step.value,
          ...validateLocatorTarget(step, index),
        };
      }

      case "getText": {
        return {
          action: "getText",
          ...validateLocatorTarget(step, index),
        };
      }

      case "waitFor":
        return {
          action: "waitFor",
          ...validateLocatorTarget(step, index),
        };

      case "verifyText": {
        if (typeof step.expected !== "string" || step.expected.trim() === "") {
          throw new Error(`steps[${index}].expected is required`);
        }

        return {
          action: "verifyText",
          expected: step.expected,
          ...validateLocatorTarget(step, index),
        };
      }

      case "screenshot":
        return {
          action: "screenshot",
        };

      default:
        throw new Error(
          `steps[${index}].action "${step.action}" is not supported`,
        );
    }
  });

  return {
    steps,
    captureTrace:
      typeof body.captureTrace === "boolean" ? body.captureTrace : false,
  };
}
