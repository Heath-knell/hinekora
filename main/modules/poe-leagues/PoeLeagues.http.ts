const maxJsonResponseBytes = 128 * 1024;

class HttpResponseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpResponseError";
    this.status = status;
  }
}

async function parseJsonResponse(
  response: Response,
  failureMessage: string,
): Promise<unknown> {
  if (!response.ok) {
    throw new HttpResponseError(
      `${failureMessage} (${response.status})`,
      response.status,
    );
  }

  const text = await readBoundedResponseText(response, failureMessage);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${failureMessage}: invalid JSON response`);
  }
}

async function readBoundedResponseText(
  response: Response,
  failureMessage: string,
): Promise<string> {
  const declaredSize = parseContentLength(response.headers);
  if (declaredSize !== null && declaredSize > maxJsonResponseBytes) {
    throw new Error(
      `${failureMessage}: response body exceeds ${maxJsonResponseBytes} bytes`,
    );
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxJsonResponseBytes) {
        await reader.cancel();
        throw new Error(
          `${failureMessage}: response body exceeds ${maxJsonResponseBytes} bytes`,
        );
      }

      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }

  return text + decoder.decode();
}

function parseContentLength(headers: Headers): number | null {
  const value = headers.get("content-length");
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue >= 0
    ? parsedValue
    : null;
}

function isRejectedAuthSessionError(error: unknown): boolean {
  return (
    error instanceof HttpResponseError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  );
}

function isAuthorizationResponseError(error: unknown): boolean {
  return (
    error instanceof HttpResponseError &&
    (error.status === 401 || error.status === 403)
  );
}

export {
  isAuthorizationResponseError,
  isRejectedAuthSessionError,
  parseJsonResponse,
};
