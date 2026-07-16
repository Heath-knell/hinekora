import { afterEach, describe, expect, it } from "vitest";

import { MigrationRunner, migrations } from "../migrations";
import { migration_20260711_000000_poe_leagues } from "../migrations/20260711_000000_poe_leagues";
import {
  insertSetting,
  MigrationTestDatabase,
  readSettings,
} from "./MigrationRunner.test-utils";

const testDatabase = new MigrationTestDatabase();

describe("Catalog league defaults migration", () => {
  afterEach(() => {
    testDatabase.close();
  });

  it("removes migration-owned league defaults for unfinished setup", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", false);
    insertSetting(db, "activeLeague", "Mirage");
    insertSetting(db, "poe1SelectedLeague", "Mirage");
    insertSetting(db, "poe2SelectedLeague", "Runes of Aldur");
    insertSetting(db, "poe1MediaLibraryLeague", "Mirage");
    insertSetting(db, "poe2MediaLibraryLeague", "Runes of Aldur");

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({ setupCompleted: false });
    expect(readSettings(db)).not.toHaveProperty("activeLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1SelectedLeague");
    expect(readSettings(db)).not.toHaveProperty("poe2SelectedLeague");
  });

  it("removes league defaults when setup completion is missing", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "activeLeague", "Mirage");
    insertSetting(db, "poe1SelectedLeague", "Mirage");

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).not.toHaveProperty("activeLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1SelectedLeague");
  });

  it("removes invalid completed-user league selections", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    insertSetting(db, "activeLeague", "");
    insertSetting(db, "poe1SelectedLeague", "x".repeat(81));
    db.prepare(
      "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)",
    ).run("poe2SelectedLeague", "{", "2026-07-01T00:00:00.000Z");
    insertSetting(db, "poe1MediaLibraryLeague", "");
    insertSetting(db, "poe2MediaLibraryLeague", 1);

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({ setupCompleted: true });
    expect(readSettings(db)).not.toHaveProperty("activeLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1SelectedLeague");
    expect(readSettings(db)).not.toHaveProperty("poe2SelectedLeague");
  });

  it("treats malformed setup completion as unfinished setup", () => {
    const db = testDatabase.createSettingsDatabase();
    db.prepare(
      "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)",
    ).run("setupCompleted", "{", "2026-07-01T00:00:00.000Z");
    insertSetting(db, "activeLeague", "Mirage");

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare("SELECT value_json FROM settings WHERE key = ?")
        .get("activeLeague"),
    ).toBeUndefined();
  });

  it("preserves completed-user league selections", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    insertSetting(db, "activeLeague", "Standard");
    insertSetting(db, "poe1SelectedLeague", "Standard");
    insertSetting(db, "poe2SelectedLeague", "Standard");
    insertSetting(db, "poe1MediaLibraryLeague", "Standard");

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      activeLeague: "Standard",
      poe1MediaLibraryLeague: "Standard",
      poe1SelectedLeague: "Standard",
      poe2SelectedLeague: "Standard",
      setupCompleted: true,
    });
  });

  it("removes only completed-user Standard leagues owned by the old settings migration", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    insertSetting(db, "activeLeague", "Standard", "2026-06-30T00:00:00.000Z");
    insertSetting(
      db,
      "poe1SelectedLeague",
      "Standard",
      "2026-06-30T00:00:00.000Z",
    );
    insertSetting(
      db,
      "poe2SelectedLeague",
      "Standard",
      "2026-07-14T00:00:00.000Z",
    );
    insertSetting(
      db,
      "poe1MediaLibraryLeague",
      "Standard",
      "2026-06-30T00:00:00.000Z",
    );

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      poe1MediaLibraryLeague: "Standard",
      poe2SelectedLeague: "Standard",
      setupCompleted: true,
    });
    expect(readSettings(db)).not.toHaveProperty("activeLeague");
    expect(readSettings(db)).not.toHaveProperty("poe1SelectedLeague");
  });

  it("preserves ambiguous Standard rows propagated by the capture profile migration", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "setupCompleted", true);
    insertSetting(db, "activeGame", "poe1", "2026-07-01T12:00:00.000Z");
    insertSetting(db, "activeLeague", "Standard", "2026-07-01T12:00:00.000Z");
    insertSetting(
      db,
      "poe1SelectedLeague",
      "Standard",
      "2026-07-01T12:00:00.000Z",
    );
    insertSetting(
      db,
      "poe2SelectedLeague",
      "Standard",
      "2026-06-30T00:00:00.000Z",
    );

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({
      activeGame: "poe1",
      activeLeague: "Standard",
      poe1SelectedLeague: "Standard",
      setupCompleted: true,
    });
  });

  it("ignores databases without a settings table when releasing owned defaults", () => {
    const database = testDatabase.createEmptyDatabase();

    expect(() =>
      migration_20260711_000000_poe_leagues.up(database),
    ).not.toThrow();
  });

  it("applies catalog-driven defaults through the registered migration order", () => {
    const db = testDatabase.createEmptyDatabase();
    const runner = new MigrationRunner(db);

    runner.runMigrations(migrations);

    const settings = readSettings(db);
    expect(settings).not.toHaveProperty("activeLeague");
    expect(settings).not.toHaveProperty("poe1SelectedLeague");
    expect(settings).not.toHaveProperty("poe2SelectedLeague");
    expect(settings).not.toHaveProperty("poe1MediaLibraryLeague");
    expect(settings).not.toHaveProperty("poe2MediaLibraryLeague");
    expect(
      db
        .prepare(
          "SELECT game, name FROM poe_leagues WHERE is_active = 1 AND is_current = 1 ORDER BY game",
        )
        .all(),
    ).toEqual([
      { game: "poe1", name: "Standard" },
      { game: "poe2", name: "Standard" },
    ]);
  });
});
