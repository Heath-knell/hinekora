import { describe, expect, it } from "vitest";

import { createDefaultSettings } from "~/types";
import { DatabaseService } from "../../database";
import { SettingsStoreRepository } from "../SettingsStore.repository";

describe("SettingsStoreRepository", () => {
  it("persists partial updates and replaces all settings", () => {
    const database = new DatabaseService(":memory:");
    const repository = new SettingsStoreRepository(database);

    expect(repository.get()).toMatchObject({
      activeGame: "poe1",
      auraOverlayShowEditingFrame: true,
      deathClipSeconds: 10,
      groupPlayDeathAlertDismissed: false,
      onboardingDismissedBeacons: [],
      poe1CharacterName: "",
      recorderOverlayShowOnStartup: true,
      recorderSettingsInfoAlertDismissed: false,
    });

    repository.setMany({
      activeGame: "poe2",
      activeLeague: "Mercenaries",
      auraOverlayShowEditingFrame: false,
      deathClipSeconds: 15,
      groupPlayDeathAlertDismissed: true,
      onboardingDismissedBeacons: ["game-selector"],
      poe1CharacterName: "Ailucannon",
      poe2CharacterName: "Ailumonk",
      recorderOverlayShowOnStartup: false,
      recorderSettingsInfoAlertDismissed: true,
    });

    expect(repository.get()).toMatchObject({
      activeGame: "poe2",
      activeLeague: "Mercenaries",
      auraOverlayShowEditingFrame: false,
      deathClipSeconds: 15,
      groupPlayDeathAlertDismissed: true,
      onboardingDismissedBeacons: ["game-selector"],
      poe1CharacterName: "Ailucannon",
      poe2CharacterName: "Ailumonk",
      recorderOverlayShowOnStartup: false,
      recorderSettingsInfoAlertDismissed: true,
    });

    repository.replace({
      ...createDefaultSettings(),
      activeGame: "poe1",
      activeLeague: "Hardcore",
      deathClipSeconds: 8,
    });

    expect(repository.get()).toMatchObject({
      activeGame: "poe1",
      activeLeague: "Hardcore",
      deathClipSeconds: 8,
    });

    database.close();
  });
});
