import { describe, expect, it } from "vitest";

import { createDefaultSettings } from "~/types";
import { normalizeLeagueSettingsUpdate } from "../SettingsStore.normalization";

const currentSettings = {
  ...createDefaultSettings(),
  activeGame: "poe1" as const,
  activeLeague: "Mirage",
  poe1SelectedLeague: "Mirage",
  poe2SelectedLeague: "Runes of Aldur",
};

describe("normalizeLeagueSettingsUpdate", () => {
  it("leaves unrelated settings updates unchanged", () => {
    expect(
      normalizeLeagueSettingsUpdate(currentSettings, {
        appStartMinimized: true,
      }),
    ).toEqual({ appStartMinimized: true });
  });

  it("mirrors the selected league when the active game changes", () => {
    expect(
      normalizeLeagueSettingsUpdate(currentSettings, { activeGame: "poe2" }),
    ).toEqual({ activeGame: "poe2", activeLeague: "Runes of Aldur" });
  });

  it("moves a legacy active league update into the active game's selection", () => {
    expect(
      normalizeLeagueSettingsUpdate(currentSettings, {
        activeLeague: "Legacy League",
      }),
    ).toEqual({
      activeLeague: "Legacy League",
      poe1SelectedLeague: "Legacy League",
    });
  });

  it("keeps an explicit per-game selection authoritative", () => {
    expect(
      normalizeLeagueSettingsUpdate(currentSettings, {
        activeLeague: "Legacy League",
        poe1SelectedLeague: "Explicit League",
      }),
    ).toEqual({
      activeLeague: "Explicit League",
      poe1SelectedLeague: "Explicit League",
    });
  });

  it("does not promote an empty legacy league value", () => {
    expect(
      normalizeLeagueSettingsUpdate(currentSettings, { activeLeague: "" }),
    ).toEqual({ activeLeague: "Mirage" });
  });
});
