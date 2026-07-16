import type { Migration } from "./Migration.interface";

type Database = Parameters<Migration["up"]>[0];

const seededAt = "2026-07-11T00:00:00.000Z";
const preferenceUpdatedAt = "2026-07-11T01:00:00.000Z";
const legacySettingsUpdatedAt = "2026-06-30T00:00:00.000Z";
const legacyLeagueSettingKeys = [
  "activeLeague",
  "poe1SelectedLeague",
  "poe2SelectedLeague",
] as const;
const migratedSettingKeys = [
  "activeLeague",
  "clipsLibraryView",
  "editorAutoPruneProjects",
  "editorLogEnabled",
  "editorMediaFilter",
  "poe1MediaLibraryLeague",
  "poe1SelectedLeague",
  "poe2MediaLibraryLeague",
  "poe2SelectedLeague",
  "telemetryCrashReporting",
  "telemetryUsageAnalytics",
] as const;
const settingsBackupTable = "migration_20260711_settings_backup";

interface StoredSetting {
  updatedAt: string;
  value: unknown;
}

const migration_20260711_000000_poe_leagues: Migration = {
  id: "20260711_000000_poe_leagues",
  description: "Add the league catalog and library preferences",
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS poe_leagues (
        game TEXT NOT NULL CHECK (game IN ('poe1', 'poe2')),
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        start_at TEXT,
        end_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
        source_updated_at TEXT,
        synced_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (game, id)
      );

      CREATE INDEX IF NOT EXISTS idx_poe_leagues_game_active
      ON poe_leagues (game, is_active, is_current DESC, name);

      CREATE TABLE IF NOT EXISTS poe_league_sync_state (
        game TEXT PRIMARY KEY CHECK (game IN ('poe1', 'poe2')),
        provider TEXT NOT NULL,
        last_synced_at TEXT NOT NULL
      );
    `);

    backupSettings(db);
    seedStandardLeagues(db);
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_poe_leagues_one_current_per_game
      ON poe_leagues (game)
      WHERE is_active = 1 AND is_current = 1;
    `);
    migrateSettings(db);
  },
  down(db) {
    restoreSettings(db);
    db.exec(`
      DROP TABLE IF EXISTS ${settingsBackupTable};
      DROP TABLE IF EXISTS poe_league_sync_state;
      DROP TABLE IF EXISTS poe_leagues;
    `);
  },
};

function backupSettings(db: Database): void {
  if (!hasTable(db, "settings")) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS ${settingsBackupTable} (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  db.prepare(
    `INSERT OR IGNORE INTO ${settingsBackupTable} (key, value_json, updated_at)
     SELECT key, value_json, updated_at
     FROM settings
     WHERE key IN (${migratedSettingKeys.map(() => "?").join(", ")})`,
  ).run(...migratedSettingKeys);
}

function restoreSettings(db: Database): void {
  if (!hasTable(db, "settings") || !hasTable(db, settingsBackupTable)) {
    return;
  }

  db.prepare(
    `DELETE FROM settings
     WHERE key IN (${migratedSettingKeys.map(() => "?").join(", ")})`,
  ).run(...migratedSettingKeys);
  db.exec(`
    INSERT INTO settings (key, value_json, updated_at)
    SELECT key, value_json, updated_at
    FROM ${settingsBackupTable};
  `);
}

function seedStandardLeagues(db: Database): void {
  const selectCurrentLeague = db.prepare(`
    SELECT id
    FROM poe_leagues
    WHERE game = ? AND is_active = 1 AND is_current = 1
    ORDER BY
      CASE
        WHEN lower(id) = 'standard' OR lower(name) = 'standard' THEN 1
        ELSE 0
      END,
      start_at DESC,
      id ASC
    LIMIT 1
  `);
  const keepOnlyCurrentLeague = db.prepare(`
    UPDATE poe_leagues
    SET is_current = CASE WHEN id = ? THEN 1 ELSE 0 END
    WHERE game = ? AND is_active = 1 AND is_current = 1
  `);
  const upsertStandardLeague = db.prepare(`
    INSERT INTO poe_leagues (
      game, id, name, start_at, end_at, is_active, is_current,
      source_updated_at, synced_at, created_at
    )
    VALUES (?, ?, ?, NULL, NULL, 1, ?, NULL, ?, ?)
    ON CONFLICT(game, id) DO UPDATE SET
      is_active = 1,
      is_current = excluded.is_current
  `);

  for (const game of ["poe1", "poe2"] as const) {
    const currentLeague = selectCurrentLeague.get(game) as
      | { id: string }
      | undefined;
    if (currentLeague) {
      keepOnlyCurrentLeague.run(currentLeague.id, game);
    }
    upsertStandardLeague.run(
      game,
      "Standard",
      "Standard",
      currentLeague && currentLeague.id !== "Standard" ? 0 : 1,
      seededAt,
      seededAt,
    );
  }
}

function migrateSettings(db: Database): void {
  if (!hasTable(db, "settings")) {
    return;
  }

  const isSetupCompleted = readSetting(db, "setupCompleted")?.value === true;
  upsertMissingOrInvalidEnumSetting(db, "clipsLibraryView", "death", [
    "death",
    "manual",
  ]);
  upsertMissingOrInvalidEnumSetting(db, "editorMediaFilter", "death-clip", [
    "recording",
    "death-clip",
    "manual-replay",
    "saved-edits",
  ]);
  upsertMissingOrInvalidBooleanSetting(db, "editorLogEnabled", false);
  upsertMissingOrInvalidBooleanSetting(db, "editorAutoPruneProjects", true);

  if (!isSetupCompleted) {
    upsertSetting(db, "editorAutoPruneProjects", true);
  }
  promoteLegacyDefault(db, "editorAutoPruneProjects", false, true);

  deleteInvalidLeagueSetting(db, "activeLeague");
  deleteInvalidLeagueSetting(db, "poe1SelectedLeague");
  deleteInvalidLeagueSetting(db, "poe2SelectedLeague");
  deleteInvalidLeagueSetting(db, "poe1MediaLibraryLeague", true);
  deleteInvalidLeagueSetting(db, "poe2MediaLibraryLeague", true);

  if (isSetupCompleted) {
    releaseLegacyLeagueDefaults(db);
  } else {
    releaseUnfinishedSetupLeagueDefaults(db);
  }

  deleteLegacyDefault(db, "telemetryCrashReporting", false);
  db.prepare("DELETE FROM settings WHERE key = ?").run(
    "telemetryUsageAnalytics",
  );
}

function hasTable(db: Database, table: string): boolean {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table) !== undefined
  );
}

function readSetting(db: Database, key: string): StoredSetting | undefined {
  const row = db
    .prepare("SELECT value_json, updated_at FROM settings WHERE key = ?")
    .get(key) as { updated_at: string; value_json: string } | undefined;
  if (!row) {
    return undefined;
  }

  try {
    return { updatedAt: row.updated_at, value: JSON.parse(row.value_json) };
  } catch {
    return { updatedAt: row.updated_at, value: undefined };
  }
}

function upsertSetting(db: Database, key: string, value: unknown): void {
  db.prepare(
    `
      INSERT INTO settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `,
  ).run(key, JSON.stringify(value), preferenceUpdatedAt);
}

function upsertMissingOrInvalidBooleanSetting(
  db: Database,
  key: string,
  defaultValue: boolean,
): void {
  if (typeof readSetting(db, key)?.value !== "boolean") {
    upsertSetting(db, key, defaultValue);
  }
}

function upsertMissingOrInvalidEnumSetting(
  db: Database,
  key: string,
  defaultValue: string,
  values: readonly string[],
): void {
  const value = readSetting(db, key)?.value;
  if (typeof value !== "string" || !values.includes(value)) {
    upsertSetting(db, key, defaultValue);
  }
}

function promoteLegacyDefault(
  db: Database,
  key: string,
  previousDefault: unknown,
  nextDefault: unknown,
): void {
  const setting = readSetting(db, key);
  if (
    setting &&
    setting.value === previousDefault &&
    setting.updatedAt === legacySettingsUpdatedAt
  ) {
    upsertSetting(db, key, nextDefault);
  }
}

function deleteLegacyDefault(db: Database, key: string, value: unknown): void {
  db.prepare(
    `DELETE FROM settings
     WHERE key = ? AND value_json = ? AND updated_at = ?`,
  ).run(key, JSON.stringify(value), legacySettingsUpdatedAt);
}

function deleteInvalidLeagueSetting(
  db: Database,
  key: string,
  allowNull = false,
): void {
  const setting = readSetting(db, key);
  if (!setting) {
    return;
  }

  const isValid =
    (allowNull && setting.value === null) ||
    (typeof setting.value === "string" &&
      setting.value.length > 0 &&
      setting.value.length <= 80);
  if (!isValid) {
    db.prepare("DELETE FROM settings WHERE key = ?").run(key);
  }
}

function releaseUnfinishedSetupLeagueDefaults(db: Database): void {
  db.prepare(
    `DELETE FROM settings WHERE key IN (
      'activeLeague', 'poe1SelectedLeague', 'poe2SelectedLeague',
      'poe1MediaLibraryLeague', 'poe2MediaLibraryLeague'
    )`,
  ).run();
}

function releaseLegacyLeagueDefaults(db: Database): void {
  db.prepare(
    `DELETE FROM settings
     WHERE key IN (${legacyLeagueSettingKeys.map(() => "?").join(", ")})
       AND value_json = ? AND updated_at = ?`,
  ).run(
    ...legacyLeagueSettingKeys,
    JSON.stringify("Standard"),
    legacySettingsUpdatedAt,
  );
}

export { migration_20260711_000000_poe_leagues };
