import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

function readCrashReportingPreference(databasePath: string): boolean {
  if (!existsSync(databasePath)) {
    return true;
  }

  let database: DatabaseSync | null = null;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const row = database
      .prepare(
        "SELECT value_json FROM settings WHERE key = 'telemetryCrashReporting' LIMIT 1",
      )
      .get() as { value_json?: unknown } | undefined;

    if (typeof row?.value_json !== "string") {
      return true;
    }

    return JSON.parse(row.value_json) !== false;
  } catch {
    // An existing database may contain an explicit opt-out. If it cannot be
    // read safely, do not report the startup failure.
    return false;
  } finally {
    database?.close();
  }
}

function shouldReportFatalStartupError(databasePath: string | null): boolean {
  return databasePath !== null && readCrashReportingPreference(databasePath);
}

export { readCrashReportingPreference, shouldReportFatalStartupError };
