import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { type AppSettings, createDefaultSettings } from "~/types";

const analyticsMocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
}));

vi.mock("~/renderer/modules/umami", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

import {
  createSettingsSlice,
  shouldTrackSettingsUpdate,
} from "./Settings.slice";

const settings: AppSettings = {
  ...createDefaultSettings(),
  activeGame: "poe2",
  activeLeague: "Standard",
  installedGames: ["poe2"],
  lastSeenAppVersion: null,
};

function createTestStore() {
  return createBoundStoreForTests(
    (set, get, api) =>
      createSettingsSlice(set, get, api) as unknown as BoundStore,
  );
}

describe("Settings slice", () => {
  const getSettings = vi.fn();
  const updateSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue(settings);
    updateSettings.mockResolvedValue({ ...settings, activeLeague: "Hardcore" });

    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        settings: {
          get: getSettings,
          update: updateSettings,
        },
      },
    });
  });

  it("hydrates and updates settings", async () => {
    const store = createTestStore();

    await store.getState().settings.hydrate();
    await store.getState().settings.update({ activeLeague: "Hardcore" });

    expect(getSettings).toHaveBeenCalled();
    expect(updateSettings).toHaveBeenCalledWith({ activeLeague: "Hardcore" });
    expect(store.getState().settings.value?.activeLeague).toBe("Hardcore");
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith("settings-updated");
  });

  it("does not track character-name-only settings updates", async () => {
    updateSettings.mockResolvedValue({
      ...settings,
      poe1CharacterName: "Ailucannon",
    });
    const store = createTestStore();

    await store.getState().settings.update({
      poe1CharacterName: "Ailucannon",
    });

    expect(updateSettings).toHaveBeenCalledWith({
      poe1CharacterName: "Ailucannon",
    });
    expect(analyticsMocks.trackEvent).not.toHaveBeenCalled();
    expect(shouldTrackSettingsUpdate({ poe2CharacterName: "Ailumonk" })).toBe(
      false,
    );
    expect(
      shouldTrackSettingsUpdate({
        activeLeague: "Hardcore",
        poe1CharacterName: "Ailucannon",
      }),
    ).toBe(true);
  });
});
