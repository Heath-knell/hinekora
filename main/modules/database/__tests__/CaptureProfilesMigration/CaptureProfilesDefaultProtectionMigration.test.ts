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

  it("does not promote profiles named like defaults when they are not marked as default", () => {
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
      "Default PoE 2 Capture",
      "poe2",
      JSON.stringify({
        isDefault: false,
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
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe1",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: true }),
          id: "default-capture-poe2",
        }),
        expect.objectContaining({
          data: expect.objectContaining({ isDefault: false }),
          id: "legacy-default-poe2",
        }),
      ]),
    );
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "legacy-default-poe2",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe2: "legacy-default-poe2",
      }),
    });
  });
});
