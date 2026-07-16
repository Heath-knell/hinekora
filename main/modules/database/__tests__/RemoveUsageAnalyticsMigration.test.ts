import { afterEach, describe, expect, it } from "vitest";

import { MigrationRunner, migrations } from "../migrations";
import { migration_20260711_000000_poe_leagues } from "../migrations/20260711_000000_poe_leagues";
import {
  insertSetting,
  MigrationTestDatabase,
  readSettings,
} from "./MigrationRunner.test-utils";

const testDatabase = new MigrationTestDatabase();

describe("Remove usage analytics migration", () => {
  afterEach(() => {
    testDatabase.close();
  });

  it("removes the retired preference without touching other settings", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "telemetryUsageAnalytics", true);
    insertSetting(db, "telemetryCrashReporting", false);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({ telemetryCrashReporting: false });
    expect(readSettings(db)).not.toHaveProperty("telemetryUsageAnalytics");
  });

  it("restores the pre-migration preference on rollback", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "telemetryUsageAnalytics", true);
    insertSetting(db, "telemetryCrashReporting", false);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.down(db);

    expect(readSettings(db)).toMatchObject({
      telemetryCrashReporting: false,
      telemetryUsageAnalytics: true,
    });
  });

  it("ignores databases without a settings table", () => {
    const database = testDatabase.createEmptyDatabase();

    expect(() =>
      migration_20260711_000000_poe_leagues.up(database),
    ).not.toThrow();
  });

  it("does not leave the retired preference on a fresh install", () => {
    const database = testDatabase.createEmptyDatabase();
    const runner = new MigrationRunner(database);

    runner.runMigrations(migrations);

    expect(readSettings(database)).not.toHaveProperty(
      "telemetryUsageAnalytics",
    );
  });
});
