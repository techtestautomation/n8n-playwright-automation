const ANSI_ESCAPE_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001b\[[0-?]*[ -/]*[@-~]/g;

export function formatAutomationError(message: string): string {
  return message.replace(ANSI_ESCAPE_PATTERN, "").trim();
}
