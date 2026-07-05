import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260701_000000_capture_profiles } from "../../migrations/20260701_000000_capture_profiles";
import {
  indexExists,
  insertSetting,
  readCaptureProfiles,
  readSettings,
  tableExists,
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

  it("creates default capture profiles on a fresh database and rolls back cleanly", () => {
    const db = createDatabase();

    migration_20260701_000000_capture_profiles.up(db);
    migration_20260701_000000_capture_profiles.up(db);

    expect(tableExists(db, "capture_profiles")).toBe(true);
    expect(indexExists(db, "idx_capture_profiles_game_updated_at")).toBe(true);
    expect(readCaptureProfiles(db)).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          captureTarget: null,
          deathClipSeconds: 10,
          game: "poe1",
          recordingAutoStartMode: "off",
          recordingFps: 30,
          recordingHideOverlaysFromRecording: true,
          recordingHideOverlaysFromRewind: true,
        }),
        game: "poe1",
        id: "default-capture-poe1",
        name: "Default PoE Capture",
      }),
      expect.objectContaining({
        data: expect.objectContaining({
          captureTarget: null,
          deathClipSeconds: 10,
          game: "poe2",
          recordingAutoStartMode: "off",
          recordingFps: 30,
          recordingHideOverlaysFromRecording: true,
          recordingHideOverlaysFromRewind: true,
        }),
        game: "poe2",
        id: "default-capture-poe2",
        name: "Default PoE 2 Capture",
      }),
    ]);

    migration_20260701_000000_capture_profiles.down(db);

    expect(tableExists(db, "capture_profiles")).toBe(false);
    expect(indexExists(db, "idx_capture_profiles_game_updated_at")).toBe(false);
  });

  it("seeds capture profiles from aura profiles and backfills the selected capture profile", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-01T00:00:00.000Z";

    db.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    insertSetting(db, "activeGame", "poe2", updatedAt);
    insertSetting(db, "selectedProfileId", "legacy-poe2", updatedAt);
    insertSetting(db, "recordingOutputResolution", "1440p", updatedAt);
    insertSetting(db, "recordingFps", 120, updatedAt);
    insertSetting(db, "recordingEncoder", "obs_nvenc_av1_tex", updatedAt);
    insertSetting(db, "recordingClipQuality", "ultra", updatedAt);
    insertSetting(db, "recordingRunQuality", "high", updatedAt);
    insertSetting(db, "recordingAudioInputDeviceId", "mic-1", updatedAt);
    insertSetting(db, "recordingAudioOutputDeviceId", "desktop-1", updatedAt);
    insertSetting(db, "recordingHideOverlaysFromRecording", false, updatedAt);
    insertSetting(db, "recordingHideOverlaysFromRewind", false, updatedAt);
    insertSetting(db, "recordingAutoStartMode", "rewind", updatedAt);
    insertSetting(db, "deathClipSeconds", 45, updatedAt);

    const insertProfile = db.prepare(`
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertProfile.run(
      "legacy-poe1",
      "Default PoE Profile",
      "poe1",
      JSON.stringify({ captureTarget: null }),
      updatedAt,
      updatedAt,
    );
    insertProfile.run(
      "legacy-poe2",
      "Bossing",
      "poe2",
      JSON.stringify({
        captureTarget: {
          id: "window:poe2",
          kind: "window",
          label: "Path of Exile 2",
        },
      }),
      updatedAt,
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);
    migration_20260701_000000_capture_profiles.up(db);

    const captureProfiles = readCaptureProfiles(db);
    const poe2Profile = captureProfiles.find(
      (profile) => profile.id === "legacy-poe2",
    );

    expect(captureProfiles).toHaveLength(4);
    expect(poe2Profile).toMatchObject({
      data: expect.objectContaining({
        captureTarget: {
          id: "window:poe2",
          kind: "window",
          label: "Path of Exile 2",
        },
        deathClipSeconds: 45,
        recordingAudioInputDeviceId: "mic-1",
        recordingAudioOutputDeviceId: "desktop-1",
        recordingAutoStartMode: "rewind",
        recordingClipQuality: "ultra",
        recordingEncoder: "obs_nvenc_av1_tex",
        recordingFps: 120,
        recordingHideOverlaysFromRecording: false,
        recordingHideOverlaysFromRewind: false,
        recordingOutputResolution: "1440p",
        recordingRunQuality: "high",
      }),
      game: "poe2",
      name: "Bossing Capture",
    });
    expect(captureProfiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe1",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe2",
        }),
      ]),
    );
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "legacy-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "legacy-poe2",
      }),
    });
  });

  it("repairs deterministic capture profile defaults without replacing selected custom profiles", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-01T00:00:00.000Z";

    db.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    insertSetting(db, "activeGame", "poe2", updatedAt);
    insertSetting(db, "selectedProfileId", "legacy-poe2", updatedAt);
    db.prepare(
      `
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-poe2",
      "Bossing",
      "poe2",
      JSON.stringify({ captureTarget: null }),
      updatedAt,
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);
    migration_20260701_000000_capture_profiles.up(db);

    expect(readCaptureProfiles(db)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe1",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe2",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: false }),
          id: "legacy-poe2",
        }),
      ]),
    );
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "legacy-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "legacy-poe2",
      }),
    });
  });
});
