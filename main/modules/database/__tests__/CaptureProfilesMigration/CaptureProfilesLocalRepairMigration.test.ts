import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260701_000000_capture_profiles } from "../../migrations/20260701_000000_capture_profiles";
import { readCaptureProfiles } from "../MigrationRunner.test-utils";

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

  it("repairs malformed local capture profile defaults without settings", () => {
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
        captureTarget: {
          id: 42,
          kind: "application",
          label: null,
        },
      }),
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
      "broken-custom-poe1",
      "Broken custom PoE 1",
      "poe1",
      "{bad",
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
      "primitive-custom-poe2",
      "Primitive custom PoE 2",
      "poe2",
      "42",
      updatedAt,
      updatedAt,
    );

    migration_20260701_000000_capture_profiles.up(db);
    migration_20260701_000000_capture_profiles.up(db);

    expect(readCaptureProfiles(db)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            captureTarget: null,
            isDefault: true,
          }),
          id: "default-capture-poe2",
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            captureTarget: null,
            isDefault: false,
          }),
          id: "broken-custom-poe1",
        }),
        expect.objectContaining({
          data: expect.objectContaining({
            captureTarget: null,
            isDefault: false,
          }),
          id: "primitive-custom-poe2",
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
  });
});
