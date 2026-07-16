import { afterEach, describe, expect, it } from "vitest";

import { AppSettingsSchema } from "~/types";
import { MigrationRunner, migrations } from "../migrations";
import { migration_20260711_000000_poe_leagues } from "../migrations/20260711_000000_poe_leagues";
import {
  insertSetting,
  MigrationTestDatabase,
  readSettings,
} from "./MigrationRunner.test-utils";

const legacyDefaultUpdatedAt = "2026-06-30T00:00:00.000Z";
const testDatabase = new MigrationTestDatabase();

describe("Crash reporting default migration", () => {
  afterEach(() => {
    testDatabase.close();
  });

  it("releases the false value owned by the old settings migration", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "telemetryCrashReporting", false, legacyDefaultUpdatedAt);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).not.toHaveProperty("telemetryCrashReporting");
  });

  it("preserves an explicit user opt-out", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "telemetryCrashReporting", false);

    migration_20260711_000000_poe_leagues.up(db);

    expect(readSettings(db)).toMatchObject({ telemetryCrashReporting: false });
  });

  it("preserves an enabled value and does not reverse user choices", () => {
    const db = testDatabase.createSettingsDatabase();
    insertSetting(db, "telemetryCrashReporting", true, legacyDefaultUpdatedAt);

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.down(db);

    expect(readSettings(db)).toMatchObject({ telemetryCrashReporting: true });
  });

  it("ignores databases without a settings table", () => {
    const database = testDatabase.createEmptyDatabase();

    expect(() =>
      migration_20260711_000000_poe_leagues.up(database),
    ).not.toThrow();
  });

  it("applies the enabled schema default through the registered migration order", () => {
    const database = testDatabase.createEmptyDatabase();
    const runner = new MigrationRunner(database);

    runner.runMigrations(migrations);

    const storedSettings = readSettings(database);
    expect(storedSettings).not.toHaveProperty("telemetryCrashReporting");
    expect(
      AppSettingsSchema.parse(storedSettings).telemetryCrashReporting,
    ).toBe(true);
  });
});
