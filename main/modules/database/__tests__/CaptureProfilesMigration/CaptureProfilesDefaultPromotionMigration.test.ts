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

  it("promotes selected legacy default capture profiles to stable default ids", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-01T00:00:00.000Z";

    db.exec(`
      CREATE TABLE capture_profiles (
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
    db.prepare(
      `
      INSERT INTO capture_profiles (
        id,
        name,
        game,
        data_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-default-poe2",
      "Default PoE 2 Profile Capture",
      "poe2",
      JSON.stringify({
        isDefault: true,
        recordingFps: 120,
        captureTarget: {
          id: "window:poe2",
          kind: "window",
          label: "Path of Exile 2",
          game: "poe2",
        },
      }),
      updatedAt,
      updatedAt,
    );
    insertSetting(
      db,
      "selectedCaptureProfileId",
      "legacy-default-poe2",
      updatedAt,
    );
    insertSetting(
      db,
      "selectedCaptureProfileIdsByGame",
      { poe2: "legacy-default-poe2" },
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);
    migration_20260701_000000_capture_profiles.up(db);

    expect(readCaptureProfiles(db)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            captureTarget: {
              game: "poe2",
              id: "window:poe2",
              kind: "window",
              label: "Path of Exile 2",
            },
            isDefault: true,
            recordingFps: 120,
          }),
          id: "default-capture-poe2",
          name: "Default PoE 2 Capture",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe1",
        }),
      ]),
    );
    expect(
      readCaptureProfiles(db).some(
        (profile) => profile.id === "legacy-default-poe2",
      ),
    ).toBe(false);
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "default-capture-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "default-capture-poe2",
      }),
    });
  });

  it("promotes legacy default capture profiles when selection memory does not reference them", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-01T00:00:00.000Z";

    db.exec(`
      CREATE TABLE capture_profiles (
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
    db.prepare(
      `
      INSERT INTO capture_profiles (
        id,
        name,
        game,
        data_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-default-poe2",
      "Default PoE 2 Profile Capture",
      "poe2",
      JSON.stringify({ isDefault: true }),
      updatedAt,
      updatedAt,
    );
    insertSetting(
      db,
      "selectedCaptureProfileIdsByGame",
      { poe1: "custom-poe1" },
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);

    expect(
      readCaptureProfiles(db).some(
        (profile) => profile.id === "legacy-default-poe2",
      ),
    ).toBe(false);
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "default-capture-poe1",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe1: "default-capture-poe1",
        poe2: "default-capture-poe2",
      }),
    });
  });
});
