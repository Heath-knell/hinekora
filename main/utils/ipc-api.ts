interface IpcValidationFailure {
  error: string;
  ok: false;
}

function isIpcValidationFailure(
  result: unknown,
): result is IpcValidationFailure {
  return (
    typeof result === "object" &&
    result !== null &&
    (result as Partial<IpcValidationFailure>).ok === false
  );
}

function unwrapIpcResult<T>(result: T | IpcValidationFailure): T {
  if (isIpcValidationFailure(result)) {
    throw new Error(result.error ?? "Operation failed");
  }

  return result as T;
}

export type { IpcValidationFailure };
export { isIpcValidationFailure, unwrapIpcResult };
