import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260702_000000_aura_profiles_global_scope } from "../migrations/20260702_000000_aura_profiles_global_scope";
import { profileGameColumnIsNullable } from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Aura profiles global-scope migration", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("skips aura profile global-scope migration when profiles are missing", () => {
    const db = createDatabase();

    expect(() =>
      migration_20260702_000000_aura_profiles_global_scope.up(db),
    ).not.toThrow();
    expect(() =>
      migration_20260702_000000_aura_profiles_global_scope.down(db),
    ).not.toThrow();
  });

  it("makes aura profile game scope nullable and resets existing profiles to all games", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-02T00:00:00.000Z";

    db.exec(`
      CREATE TABLE profiles (
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
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "aura-profile-1",
      "Bossing",
      "poe2",
      JSON.stringify({
        id: "aura-profile-1",
        name: "Bossing",
        game: "poe2",
        targetFps: 30,
        captureTarget: null,
        cropRegions: [],
        overlayPlacements: [],
        createdAt: updatedAt,
        updatedAt,
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
      "aura-profile-invalid-json",
      "Broken",
      "poe2",
      "{bad",
      updatedAt,
      updatedAt,
    );

    migration_20260702_000000_aura_profiles_global_scope.up(db);
    migration_20260702_000000_aura_profiles_global_scope.up(db);

    expect(profileGameColumnIsNullable(db)).toBe(true);
    const globalRow = db
      .prepare("SELECT game, data_json FROM profiles WHERE id = ?")
      .get("aura-profile-1") as { data_json: string; game: string | null };
    expect(globalRow.game).toBeNull();
    expect(JSON.parse(globalRow.data_json)).toMatchObject({ game: null });
    const repairedInvalidRow = db
      .prepare("SELECT game, data_json FROM profiles WHERE id = ?")
      .get("aura-profile-invalid-json") as {
      data_json: string;
      game: string | null;
    };
    expect(repairedInvalidRow.game).toBeNull();
    expect(JSON.parse(repairedInvalidRow.data_json)).toEqual({ game: null });

    migration_20260702_000000_aura_profiles_global_scope.down(db);

    expect(profileGameColumnIsNullable(db)).toBe(false);
    const rolledBackRow = db
      .prepare("SELECT game, data_json FROM profiles WHERE id = ?")
      .get("aura-profile-1") as { data_json: string; game: string };
    expect(rolledBackRow.game).toBe("poe1");
    expect(JSON.parse(rolledBackRow.data_json)).toMatchObject({
      game: "poe1",
    });
  });

  it("rolls back nullable aura profiles with existing game data", () => {
    const db = createDatabase();
    const updatedAt = "2026-07-02T00:00:00.000Z";

    db.exec(`
      CREATE TABLE profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    db.prepare(
      `
      INSERT INTO profiles (id, name, game, data_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run("aura-profile-poe2", "PoE 2", "poe2", "42", updatedAt, updatedAt);

    migration_20260702_000000_aura_profiles_global_scope.down(db);

    expect(profileGameColumnIsNullable(db)).toBe(false);
    const row = db
      .prepare("SELECT game, data_json FROM profiles WHERE id = ?")
      .get("aura-profile-poe2") as { data_json: string; game: string };
    expect(row.game).toBe("poe2");
    expect(JSON.parse(row.data_json)).toEqual({ game: "poe2" });
  });
});
