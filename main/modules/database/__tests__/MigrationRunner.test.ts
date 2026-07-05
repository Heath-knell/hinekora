import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { type Migration, MigrationRunner, migrations } from "../migrations";
import {
  createTableMigration,
  tableExists,
} from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("MigrationRunner", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("keeps migration files independent from live app settings schemas", () => {
    const migrationDirectory = join(
      process.cwd(),
      "main",
      "modules",
      "database",
      "migrations",
    );
    const migrationFiles = readdirSync(migrationDirectory).filter((file) =>
      /^\d{8}_\d{6}_.+\.ts$/.test(file),
    );

    for (const file of migrationFiles) {
      const content = readFileSync(join(migrationDirectory, file), "utf8");

      expect(content, file).not.toMatch(/AppSettingsSchema/);
      expect(content, file).not.toMatch(/AppSettingsKey/);
      expect(content, file).not.toMatch(/createDefaultSettings/);
    }
  });

  it("creates the migrations tracking table", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);

    expect(tableExists(db, "migrations")).toBe(true);
    expect(runner.getAppliedMigrationIds()).toEqual([]);
  });

  it("rolls back Hinekora migrations in reverse order", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);

    runner.runMigrations(migrations);

    for (const migration of [...migrations].reverse()) {
      expect(runner.rollbackMigration(migration)).toBe(true);
    }

    expect(runner.getAppliedMigrationIds()).toEqual([]);
    expect(tableExists(db, "editor_projects")).toBe(false);
    expect(tableExists(db, "run_recordings")).toBe(false);
    expect(tableExists(db, "recording_storage_path_migrations")).toBe(false);
    expect(tableExists(db, "profiles")).toBe(false);
  });

  it("runs only migrations that are still pending", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);
    const first = createTableMigration("first_migration");
    const second = createTableMigration("second_migration");

    runner.runMigrations([first]);
    runner.runMigrations([first, second]);

    expect(tableExists(db, "first_migration")).toBe(true);
    expect(tableExists(db, "second_migration")).toBe(true);
    expect(runner.getAppliedMigrationIds()).toEqual([
      "first_migration",
      "second_migration",
    ]);
  });

  it("rolls back all changes when a pending migration fails", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);
    const failingMigration: Migration = {
      id: "failing_migration",
      description: "Fail after making a schema change",
      up(database) {
        database.exec("CREATE TABLE should_not_survive (id TEXT PRIMARY KEY)");
        throw new Error("migration failed");
      },
      down(database) {
        database.exec("DROP TABLE should_not_survive");
      },
    };

    expect(() => runner.runMigrations([failingMigration])).toThrow(
      "migration failed",
    );
    expect(tableExists(db, "should_not_survive")).toBe(false);
    expect(runner.getAppliedMigrationIds()).toEqual([]);
  });

  it("returns false when rolling back a migration that was not applied", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);
    const migration = createTableMigration("not_applied");

    expect(runner.rollbackMigration(migration)).toBe(false);
  });

  it("rejects duplicate migration ids", () => {
    const db = createDatabase();
    const runner = new MigrationRunner(db);
    const first = createTableMigration("duplicate_id");
    const second = createTableMigration("duplicate_id");

    expect(() => runner.runMigrations([first, second])).toThrow(
      "[Migrations] Duplicate migration id: duplicate_id",
    );
  });
});
