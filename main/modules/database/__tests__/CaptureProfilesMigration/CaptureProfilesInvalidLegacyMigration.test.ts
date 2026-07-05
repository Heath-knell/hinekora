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

  it("falls back safely when legacy capture profile data or settings are invalid", () => {
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

    insertSetting(db, "activeGame", "poe3", updatedAt);
    insertSetting(db, "selectedProfileId", "", updatedAt);
    insertSetting(db, "recordingOutputResolution", "", updatedAt);
    insertSetting(db, "recordingFps", "fast", updatedAt);
    insertSetting(db, "recordingEncoder", "not-real", updatedAt);
    insertSetting(db, "recordingClipQuality", "cinematic", updatedAt);
    insertSetting(db, "recordingRunQuality", "cinematic", updatedAt);
    insertSetting(
      db,
      "recordingAudioInputDeviceId",
      "x".repeat(513),
      updatedAt,
    );
    insertSetting(
      db,
      "recordingAudioOutputDeviceId",
      "x".repeat(513),
      updatedAt,
    );
    insertSetting(db, "recordingHideOverlaysFromRecording", "false", updatedAt);
    insertSetting(db, "recordingHideOverlaysFromRewind", "false", updatedAt);
    insertSetting(db, "recordingAutoStartMode", "session", updatedAt);
    insertSetting(db, "deathClipSeconds", "many", updatedAt);
    db.prepare(
      `
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run("legacy-bad", "Broken", "poe1", "{bad", updatedAt, updatedAt);
    db.prepare(
      `
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-bad-target",
      "Bad Target",
      "poe2",
      JSON.stringify({
        captureTarget: { id: 42, kind: "application", label: null },
      }),
      updatedAt,
      updatedAt,
    );
    db.prepare(
      `
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-invalid-game",
      "Invalid Game",
      "poe3",
      JSON.stringify({ captureTarget: null }),
      updatedAt,
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);

    const captureProfiles = readCaptureProfiles(db);
    const brokenProfile = captureProfiles.find(
      (profile) => profile.id === "legacy-bad",
    );

    expect(captureProfiles).toHaveLength(4);
    expect(brokenProfile).toMatchObject({
      data: expect.objectContaining({
        captureTarget: null,
        deathClipSeconds: 10,
        recordingAudioInputDeviceId: null,
        recordingAudioOutputDeviceId: null,
        recordingAutoStartMode: "off",
        recordingClipQuality: "high",
        recordingEncoder: "hardware_h264",
        recordingFps: 30,
        recordingHideOverlaysFromRecording: true,
        recordingHideOverlaysFromRewind: true,
        recordingOutputResolution: "native",
        recordingRunQuality: "moderate",
      }),
      game: "poe1",
      name: "Broken Capture",
    });
    expect(
      captureProfiles.find((profile) => profile.id === "legacy-bad-target"),
    ).toMatchObject({
      data: expect.objectContaining({
        captureTarget: null,
      }),
      game: "poe2",
      name: "Bad Target Capture",
    });
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "default-capture-poe1",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe1: "default-capture-poe1",
      }),
    });
  });
});
