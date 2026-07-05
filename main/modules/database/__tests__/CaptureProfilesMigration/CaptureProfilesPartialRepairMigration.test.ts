import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260701_000000_capture_profiles } from "../../migrations/20260701_000000_capture_profiles";
import {
  insertSetting,
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

  it("repairs partial local data before backfilling the active-game capture profile", () => {
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
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "legacy-poe1",
      "Legacy PoE 1",
      "poe1",
      JSON.stringify({ captureTarget: null }),
      updatedAt,
      updatedAt,
    );
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
      "legacy-poe1",
      "Invalid Existing",
      "poe3",
      "{}",
      updatedAt,
      updatedAt,
    );
    insertSetting(db, "activeGame", "poe1");

    migration_20260701_000000_capture_profiles.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe1",
      selectedCaptureProfileId: "default-capture-poe1",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe1: "default-capture-poe1",
      }),
    });
  });

  it("tolerates invalid preexisting capture profile rows from a partial local migration", () => {
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
      "invalid-existing",
      "Invalid Existing",
      "poe3",
      "{}",
      updatedAt,
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);

    expect(
      db.prepare("SELECT COUNT(*) AS count FROM capture_profiles").get(),
    ).toMatchObject({ count: 3 });
    expect(readSettings(db)).toMatchObject({
      selectedCaptureProfileId: "default-capture-poe1",
      selectedCaptureProfileIdsByGame: expect.objectContaining({
        poe1: "default-capture-poe1",
      }),
    });
  });

  it("removes the selected capture profile setting when rolling back capture profiles", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    migration_20260701_000000_capture_profiles.up(db);
    expect(readSettings(db)).toHaveProperty("selectedCaptureProfileId");
    expect(readSettings(db)).toHaveProperty("selectedCaptureProfileIdsByGame");

    migration_20260701_000000_capture_profiles.down(db);

    expect(tableExists(db, "capture_profiles")).toBe(false);
    expect(readSettings(db)).not.toHaveProperty("selectedCaptureProfileId");
    expect(readSettings(db)).not.toHaveProperty(
      "selectedCaptureProfileIdsByGame",
    );
  });
});
