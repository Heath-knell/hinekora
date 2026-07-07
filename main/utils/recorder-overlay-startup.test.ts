import { afterEach, describe, expect, it, vi } from "vitest";

import * as appLog from "./app-log";
import { requestRecorderOverlayOnStartup } from "./recorder-overlay-startup";

describe("recorder-overlay-startup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the recorder overlay when startup visibility is enabled", async () => {
    const showRecorderOverlay = vi.fn(async () => undefined);
    const logInfo = vi.spyOn(appLog, "logInfo").mockImplementation(() => {});

    await expect(
      requestRecorderOverlayOnStartup(
        { recorderOverlayShowOnStartup: true },
        { showRecorderOverlay },
      ),
    ).resolves.toBe(true);

    expect(showRecorderOverlay).toHaveBeenCalledTimes(1);
    expect(logInfo).toHaveBeenCalledWith(
      "startup",
      "Recorder overlay requested",
    );
  });

  it("skips the recorder overlay when startup visibility is disabled", async () => {
    const showRecorderOverlay = vi.fn(async () => undefined);
    const logInfo = vi.spyOn(appLog, "logInfo").mockImplementation(() => {});

    await expect(
      requestRecorderOverlayOnStartup(
        { recorderOverlayShowOnStartup: false },
        { showRecorderOverlay },
      ),
    ).resolves.toBe(false);

    expect(showRecorderOverlay).not.toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      "startup",
      "Recorder overlay startup request skipped",
    );
  });
});
