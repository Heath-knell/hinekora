import { beforeEach, describe, expect, it, vi } from "vitest";

const telemetryMocks = vi.hoisted(() => ({
  initSentry: vi.fn(),
}));

vi.mock("./sentry", () => ({
  initSentry: telemetryMocks.initSentry,
}));

import { initTelemetry } from "./telemetry";

describe("renderer telemetry bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("initializes telemetry only when settings explicitly enable it", async () => {
    const getSettings = vi.fn().mockResolvedValue({
      telemetryCrashReporting: true,
    });
    vi.stubGlobal("electron", {
      settings: {
        get: getSettings,
      },
    });

    await initTelemetry();

    expect(getSettings).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.initSentry).toHaveBeenCalledWith(true);
  });

  it("treats missing telemetry fields in scoped settings as disabled", async () => {
    vi.stubGlobal("electron", {
      settings: {
        get: vi.fn().mockResolvedValue({
          clipPreviewInfoAlertDismissed: false,
        }),
      },
    });

    await initTelemetry();

    expect(telemetryMocks.initSentry).toHaveBeenCalledWith(false);
  });
});
