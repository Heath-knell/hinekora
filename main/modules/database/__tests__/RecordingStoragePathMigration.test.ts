import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { MigrationRunner } from "../migrations";
import { migration_20260630_000000_settings_cleanup } from "../migrations/20260630_000000_settings_cleanup";
import { migration_20260630_010000_recording_storage_path_migrations } from "../migrations/20260630_010000_recording_storage_path_migrations";
import { indexExists, tableExists } from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Recording storage path migration", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("creates the recording storage path migration journal idempotently", () => {
    const db = createDatabase();

    migration_20260630_010000_recording_storage_path_migrations.up(db);
    migration_20260630_010000_recording_storage_path_migrations.up(db);

    expect(tableExists(db, "recording_storage_path_migrations")).toBe(true);
    expect(
      indexExists(db, "idx_recording_storage_path_migrations_status"),
    ).toBe(true);
    expect(() =>
      db
        .prepare(
          `
          INSERT INTO recording_storage_path_migrations (
            from_path,
            to_path,
            status,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        )
        .run(
          "recordings/Manual Clips/manual.mp4",
          "recordings/Manual Replays/manual.mp4",
          "failed",
          "2026-06-30T00:00:00.000Z",
          "2026-06-30T00:00:00.000Z",
        ),
    ).toThrow();

    migration_20260630_010000_recording_storage_path_migrations.down(db);

    expect(tableExists(db, "recording_storage_path_migrations")).toBe(false);
  });

  it("creates the recording storage path migration journal after settings cleanup was already applied", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);

    db.prepare(
      "INSERT INTO migrations (id, description, applied_at) VALUES (?, ?, ?)",
    ).run(
      migration_20260630_000000_settings_cleanup.id,
      migration_20260630_000000_settings_cleanup.description,
      "2026-06-30T00:00:00.000Z",
    );

    runner.runMigrations([
      migration_20260630_000000_settings_cleanup,
      migration_20260630_010000_recording_storage_path_migrations,
    ]);

    expect(tableExists(db, "recording_storage_path_migrations")).toBe(true);
    expect(runner.getAppliedMigrationIds()).toEqual([
      migration_20260630_000000_settings_cleanup.id,
      migration_20260630_010000_recording_storage_path_migrations.id,
    ]);
  });
});
