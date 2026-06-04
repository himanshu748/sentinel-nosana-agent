export const ACTION_FAILURE_CODE = "ACTION_EXECUTION_FAILED";

export function safeActionError(): string {
  return ACTION_FAILURE_CODE;
}
