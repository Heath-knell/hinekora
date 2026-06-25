import { describe, expect, it } from "vitest";

import { isIpcValidationFailure, unwrapIpcResult } from "./ipc-api";

describe("ipc-api", () => {
  it("returns successful IPC results unchanged", () => {
    const result = { ok: true, value: "ready" };

    expect(isIpcValidationFailure(result)).toBe(false);
    expect(unwrapIpcResult(result)).toBe(result);
  });

  it("throws validation failure messages", () => {
    const failure = { ok: false, error: "id is too short" } as const;

    expect(isIpcValidationFailure(failure)).toBe(true);
    expect(() => unwrapIpcResult(failure)).toThrow("id is too short");
  });

  it("falls back when a failure has no message", () => {
    const failure = { ok: false } as never;

    expect(isIpcValidationFailure(failure)).toBe(true);
    expect(() => unwrapIpcResult(failure)).toThrow("Operation failed");
  });
});
