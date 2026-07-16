import { beforeEach, describe, expect, it, vi } from "vitest";

import { logInfo, logWarn } from "~/main/utils/app-log";

import type { AppSettings, PoeLeaguesChangedEvent } from "~/types";
import { createActivePoeLeagueCatalog, createDefaultSettings } from "~/types";
import { startPoeLeaguesWhenSetupCompleted } from "../PoeLeagues.startup";

vi.mock("~/main/utils/app-log", () => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
}));

function createLeagueEvent(isFetching: boolean): PoeLeaguesChangedEvent {
  return {
    game: "poe1",
    leagues: createActivePoeLeagueCatalog().poe1,
    status: {
      error: null,
      isFetching,
      lastSyncedAt: null,
      provider: "test-provider",
    },
  };
}

function createHarness(setupCompleted: boolean) {
  let leagueListener: ((event: PoeLeaguesChangedEvent) => void) | null = null;
  let settingsListener: ((settings: AppSettings) => void) | null = null;
  const initialize = vi.fn(async () => undefined);
  const stopLeagueListener = vi.fn();
  const stopSettingsListener = vi.fn();
  const refreshCatalogDefaults = vi.fn();
  const settings = {
    ...createDefaultSettings(),
    setupCompleted,
  };
  const poeLeagues = {
    initialize,
    onDidChange: vi.fn((listener: typeof leagueListener) => {
      leagueListener = listener;
      return stopLeagueListener;
    }),
  };
  const settingsStore = {
    get: vi.fn(() => settings),
    onDidChange: vi.fn((listener: typeof settingsListener) => {
      settingsListener = listener;
      return stopSettingsListener;
    }),
    refreshCatalogDefaults,
  };

  return {
    emitLeagueChange: (isFetching: boolean) => {
      leagueListener?.(createLeagueEvent(isFetching));
    },
    emitSettingsChange: (isComplete: boolean) => {
      settingsListener?.({ ...settings, setupCompleted: isComplete });
    },
    initialize,
    poeLeagues,
    refreshCatalogDefaults,
    settingsStore,
    stopLeagueListener,
    stopSettingsListener,
  };
}

describe("startup PoE league initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts immediately for a completed setup and refreshes defaults after fetch", async () => {
    const harness = createHarness(true);

    const dispose = startPoeLeaguesWhenSetupCompleted(
      harness.poeLeagues,
      harness.settingsStore,
    );
    harness.emitLeagueChange(true);
    harness.emitLeagueChange(false);
    await Promise.resolve();

    expect(harness.initialize).toHaveBeenCalledOnce();
    expect(harness.refreshCatalogDefaults).toHaveBeenCalledOnce();
    expect(logInfo).toHaveBeenCalledWith(
      "startup",
      "PoE leagues initialization started",
    );
    expect(logInfo).toHaveBeenCalledWith("startup", "PoE leagues initialized");

    dispose();
    expect(harness.stopLeagueListener).toHaveBeenCalledOnce();
    expect(harness.stopSettingsListener).not.toHaveBeenCalled();
  });

  it("waits for setup completion and starts only once", () => {
    const harness = createHarness(false);

    const dispose = startPoeLeaguesWhenSetupCompleted(
      harness.poeLeagues,
      harness.settingsStore,
    );
    harness.emitSettingsChange(false);
    harness.emitSettingsChange(true);
    harness.emitSettingsChange(true);

    expect(harness.initialize).toHaveBeenCalledOnce();
    expect(harness.stopSettingsListener).toHaveBeenCalledOnce();
    expect(logInfo).toHaveBeenCalledWith(
      "startup",
      "PoE leagues initialization deferred until setup",
    );

    dispose();
    expect(harness.stopSettingsListener).toHaveBeenCalledOnce();
    expect(harness.stopLeagueListener).toHaveBeenCalledOnce();
  });

  it("logs initialization failures without rejecting startup", async () => {
    const harness = createHarness(true);
    harness.initialize.mockRejectedValueOnce(new Error("provider offline"));

    startPoeLeaguesWhenSetupCompleted(
      harness.poeLeagues,
      harness.settingsStore,
    );
    await Promise.resolve();

    expect(logWarn).toHaveBeenCalledWith(
      "startup",
      "PoE leagues initialization failed",
      { error: "provider offline" },
    );
  });
});
