import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import {
  readCrashReportingPreference,
  shouldReportFatalStartupError,
} from "../Sentry.bootstrap-preference";

const directories: string[] = [];

function createDatabase(valueJson?: string): string {
  const directory = mkdtempSync(join(tmpdir(), "hinekora-sentry-setting-"));
  directories.push(directory);
  const databasePath = join(directory, "hinekora.sqlite");
  const database = new DatabaseSync(databasePath);
  database.exec(
    "CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)",
  );
  if (valueJson !== undefined) {
    database
      .prepare("INSERT INTO settings (key, value_json) VALUES (?, ?)")
      .run("telemetryCrashReporting", valueJson);
  }
  database.close();
  return databasePath;
}

describe("bootstrap crash-reporting preference", () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("honors an explicit opt-out before the settings service starts", () => {
    expect(readCrashReportingPreference(createDatabase("false"))).toBe(false);
  });

  it("keeps the enabled default for true, missing rows, or a missing database", () => {
    expect(readCrashReportingPreference(createDatabase("true"))).toBe(true);
    expect(readCrashReportingPreference(createDatabase())).toBe(true);
    expect(readCrashReportingPreference("Z:\\missing\\hinekora.sqlite")).toBe(
      true,
    );
  });

  it("fails closed for an existing database whose preference cannot be read", () => {
    expect(readCrashReportingPreference(createDatabase("not-json"))).toBe(
      false,
    );
    const directory = mkdtempSync(join(tmpdir(), "hinekora-sentry-corrupt-"));
    directories.push(directory);
    const databasePath = join(directory, "hinekora.sqlite");
    writeFileSync(databasePath, "not a sqlite database");

    expect(readCrashReportingPreference(databasePath)).toBe(false);
  });

  it("does not report a fatal error before the database path is known", () => {
    expect(shouldReportFatalStartupError(null)).toBe(false);
    expect(shouldReportFatalStartupError(createDatabase("false"))).toBe(false);
    expect(shouldReportFatalStartupError(createDatabase("true"))).toBe(true);
  });
});
