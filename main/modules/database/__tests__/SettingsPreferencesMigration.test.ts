import { afterEach, describe, expect, it } from "vitest";

import { MigrationRunner, migrations } from "../migrations";
import { migration_20260711_000000_poe_leagues } from "../migrations/20260711_000000_poe_leagues";
import {
  insertSetting,
  MigrationTestDatabase,
  readSettings,
} from "./MigrationRunner.test-utils";

const testDatabase = new MigrationTestDatabase();

describe("Settings preferences migration", () => {
  afterEach(() => {
    testDatabase.close();
  });

  it("ignores databases without a settings table", () => {
    const database = testDatabase.createEmptyDatabase();

    expect(() =>
      migration_20260711_000000_poe_leagues.up(database),
    ).not.toThrow();
  });

  it("restores changed and removed settings exactly on rollback", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", false);
    insertSetting(db, "activeLeague", "Standard");
    insertSetting(db, "editorAutoPruneProjects", false);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.down(db);

    expect(readSettings(db)).toMatchObject({
      activeLeague: "Standard",
      editorAutoPruneProjects: false,
      setupCompleted: false,
    });
    expect(readSettings(db)).not.toHaveProperty("clipsLibraryView");
  });

  it("adds preferences and releases unfinished-setup league selections", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", false);
    insertSetting(db, "activeGame", "poe2");
    insertSetting(db, "activeLeague", "Standard");
    insertSetting(db, "poe1SelectedLeague", "Standard");
    insertSetting(db, "poe2SelectedLeague", "Standard");
    insertSetting(db, "editorAutoPruneProjects", false);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe2",
      clipsLibraryView: "death",
      editorAutoPruneProjects: true,
      editorLogEnabled: false,
      editorMediaFilter: "death-clip",
      setupCompleted: false,
    });
    expect(readSettings(db)).not.toHaveProperty("activeLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1SelectedLeague");
    expect(readSettings(db)).not.toHaveProperty("poe2SelectedLeague");
  });

  it("preserves user-owned leagues, prune choice, and valid preferences", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    insertSetting(db, "activeLeague", "Standard");
    insertSetting(db, "poe1SelectedLeague", "Standard");
    insertSetting(db, "poe2SelectedLeague", "Standard");
    insertSetting(db, "poe2MediaLibraryLeague", "Hardcore");
    insertSetting(db, "clipsLibraryView", "manual");
    insertSetting(db, "editorMediaFilter", "recording");
    insertSetting(db, "editorAutoPruneProjects", false);
    insertSetting(db, "editorLogEnabled", true);

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      activeLeague: "Standard",
      clipsLibraryView: "manual",
      editorAutoPruneProjects: false,
      editorLogEnabled: true,
      editorMediaFilter: "recording",
      poe1SelectedLeague: "Standard",
      poe2MediaLibraryLeague: "Hardcore",
      poe2SelectedLeague: "Standard",
    });
    expect(readSettings(db)).not.toHaveProperty("poe1MediaLibraryLeague");
  });

  it("repairs invalid preference values without writing release league names", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    db.prepare(
      "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)",
    ).run("clipsLibraryView", "{", "2026-07-01T00:00:00.000Z");
    insertSetting(db, "editorMediaFilter", "everything");
    insertSetting(db, "editorAutoPruneProjects", "yes");
    insertSetting(db, "editorLogEnabled", 1);

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      clipsLibraryView: "death",
      editorAutoPruneProjects: true,
      editorLogEnabled: false,
      editorMediaFilter: "death-clip",
    });
  });

  it("preserves ambiguous capture-profile league rows through the registered migration order", () => {
    const db = testDatabase.createEmptyDatabase();
    const runner = new MigrationRunner(db);
    const captureProfilesIndex = migrations.findIndex(
      (migration) => migration.id === "20260701_000000_capture_profiles",
    );

    runner.runMigrations(migrations.slice(0, captureProfilesIndex));
    db.prepare(
      `
        UPDATE settings
        SET value_json = ?, updated_at = ?
        WHERE key = 'setupCompleted'
      `,
    ).run(JSON.stringify(true), "2026-07-01T12:00:00.000Z");
    runner.runMigrations(migrations.slice(captureProfilesIndex));

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe1",
      activeLeague: "Standard",
      editorAutoPruneProjects: true,
      poe1SelectedLeague: "Standard",
    });
    expect(readSettings(db)).not.toHaveProperty("poe2SelectedLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1MediaLibraryLeague");
    expect(readSettings(db)).not.toHaveProperty("poe2MediaLibraryLeague");
    expect(runner.getAppliedMigrationIds()).toEqual(
      migrations.map((migration) => migration.id),
    );
  });
});
