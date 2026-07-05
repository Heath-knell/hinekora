import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260701_000000_capture_profiles } from "../../migrations/20260701_000000_capture_profiles";
import {
  insertSetting,
  readCaptureProfiles,
  readSettings,
} from "../MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Capture profiles migration", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("preserves an existing selected capture profile when it still exists", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    insertSetting(db, "selectedCaptureProfileId", "default-capture-poe2");
    insertSetting(db, "activeGame", "poe1");
    insertSetting(db, "activeLeague", "Settlers");
    insertSetting(db, "poe1SelectedLeague", "Settlers");
    insertSetting(db, "poe2SelectedLeague", "Runes of Aldur");

    migration_20260701_000000_capture_profiles.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe2",
      activeLeague: "Runes of Aldur",
      poe2SelectedLeague: "Runes of Aldur",
      selectedCaptureProfileId: "default-capture-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "default-capture-poe2",
      }),
    });
    expect(readCaptureProfiles(db)).toHaveLength(2);

    migration_20260701_000000_capture_profiles.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe2",
      activeLeague: "Runes of Aldur",
      poe2SelectedLeague: "Runes of Aldur",
      selectedCaptureProfileId: "default-capture-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "default-capture-poe2",
      }),
    });
  });

  it("repairs a stale selected capture profile setting", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    insertSetting(db, "selectedCaptureProfileId", "missing-capture-profile");
    insertSetting(db, "activeGame", "poe2");

    migration_20260701_000000_capture_profiles.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe2",
      selectedCaptureProfileId: "default-capture-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "default-capture-poe2",
      }),
    });
  });

  it("falls back to active game when the legacy selected profile is missing", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    insertSetting(db, "selectedProfileId", "missing-profile");
    insertSetting(db, "activeGame", "poe2");

    migration_20260701_000000_capture_profiles.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe2",
      selectedCaptureProfileId: "default-capture-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "default-capture-poe2",
      }),
    });
  });

  it("falls back to the first available capture profile when the active-game profile disappears during repair", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE capture_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TRIGGER delete_poe2_capture_profile_after_insert
      AFTER INSERT ON capture_profiles
      WHEN NEW.game = 'poe2'
      BEGIN
        DELETE FROM capture_profiles WHERE id = NEW.id;
      END;

      CREATE TRIGGER delete_poe2_capture_profile_after_update
      AFTER UPDATE ON capture_profiles
      WHEN NEW.game = 'poe2'
      BEGIN
        DELETE FROM capture_profiles WHERE id = NEW.id;
      END;

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    insertSetting(db, "activeGame", "poe2");
    insertSetting(db, "selectedProfileId", "missing-profile");

    migration_20260701_000000_capture_profiles.up(db);

    expect(readCaptureProfiles(db)).toEqual([
      expect.objectContaining({
        game: "poe1",
        id: "default-capture-poe1",
      }),
    ]);
    expect(readSettings(db)).toMatchObject({
      activeGame: "poe1",
      selectedCaptureProfileId: "default-capture-poe1",
      selectedCaptureProfileIdsByGame: {
        poe1: "default-capture-poe1",
      },
    });
  });
});
