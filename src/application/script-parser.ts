import type {
  AutomationAction,
  AutomationRunRequest,
} from "../domain/automation.js";

export class ScriptParser {
  parse(script: string): AutomationRunRequest {
    const lines = script
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      throw new Error("Script must contain at least one command");
    }

    const steps = lines.map((line, index) => this.parseLine(line, index + 1));

    return {
      steps,
      captureTrace: true,
    };
  }

  private parseLine(line: string, lineNumber: number): AutomationAction {
    const [command] = line.split(/\s+/, 1);

    switch (command) {
      case "OPEN": {
        const url = line.slice("OPEN".length).trim();

        if (!url) {
          throw new Error(`Line ${lineNumber}: OPEN requires a URL`);
        }

        return {
          action: "navigate",
          url,
        };
      }

      case "READ": {
        const locatorRef = line.slice("READ".length).trim();

        if (!locatorRef) {
          throw new Error(
            `Line ${lineNumber}: READ requires an element reference`,
          );
        }

        return {
          action: "getText",
          locatorRef,
        };
      }

      case "VERIFY": {
        const match = line.match(/^VERIFY\s+TEXT\s+(.+?)\s*=\s*(.+)$/i);

        if (!match) {
          throw new Error(
            `Line ${lineNumber}: Expected VERIFY TEXT <element> = <expected text>`,
          );
        }

        const [, locatorRef, expected] = match;

        if (!locatorRef?.trim()) {
          throw new Error(
            `Line ${lineNumber}: VERIFY TEXT requires an element reference`,
          );
        }

        if (!expected?.trim()) {
          throw new Error(
            `Line ${lineNumber}: VERIFY TEXT requires expected text`,
          );
        }

        return {
          action: "verifyText",
          locatorRef: locatorRef.trim(),
          expected: expected.trim(),
        };
      }

      case "TYPE": {
        const match = line.match(/^TYPE\s+(.+?)\s*=\s*(.*)$/i);

        if (!match) {
          throw new Error(
            `Line ${lineNumber}: Expected TYPE <element> = <value>`,
          );
        }

        const locatorRef = match[1]?.trim();
        const value = match[2] ?? "";

        if (!locatorRef) {
          throw new Error(
            `Line ${lineNumber}: TYPE requires an element reference`,
          );
        }

        return {
          action: "fill",
          locatorRef,
          value,
        };
      }

      case "CLICK": {
        const locatorRef = line.slice("CLICK".length).trim();

        if (!locatorRef) {
          throw new Error(
            `Line ${lineNumber}: CLICK requires an element reference`,
          );
        }

        return {
          action: "click",
          locatorRef,
        };
      }

      case "WAIT": {
        const locatorRef = line.slice("WAIT".length).trim();

        if (!locatorRef) {
          throw new Error(
            `Line ${lineNumber}: WAIT requires an element reference`,
          );
        }

        return {
          action: "waitFor",

          locatorRef,
        };
      }

      case "SCREENSHOT": {
        if (line !== "SCREENSHOT") {
          throw new Error(
            `Line ${lineNumber}: SCREENSHOT does not accept arguments`,
          );
        }

        return {
          action: "screenshot",
        };
      }

      default:
        throw new Error(`Line ${lineNumber}: Unsupported command "${line}"`);
    }
  }
}
