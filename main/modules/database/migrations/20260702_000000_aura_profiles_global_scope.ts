import type { DatabaseSync } from "node:sqlite";

import type { Migration } from "./Migration.interface";

type GameId = "poe1" | "poe2";

interface ProfileRow {
  id: string;
  name: string;
  game: string | null;
  data_json: string;
  created_at: string;
  updated_at: string;
}

const fallbackGame: GameId = "poe1";

const migration_20260702_000000_aura_profiles_global_scope: Migration = {
  id: "20260702_000000_aura_profiles_global_scope",
  description: "Make aura profile game scope optional",
  up(db) {
    if (!tableExists(db, "profiles")) {
      return;
    }

    if (!profileGameColumnIsNullable(db)) {
      rebuildProfilesTable(db, true);
    }
    updateProfileGameScope(db, null);
  },
  down(db) {
    if (!tableExists(db, "profiles")) {
      return;
    }

    rebuildProfilesTable(db, false);
  },
};

function rebuildProfilesTable(db: DatabaseSync, nullableGame: boolean): void {
  const rows = readProfileRows(db);

  db.exec("DROP TABLE IF EXISTS profiles_next");
  db.exec(`
    CREATE TABLE profiles_next (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game ${
        nullableGame
          ? "TEXT CHECK(game IS NULL OR game IN ('poe1', 'poe2'))"
          : "TEXT NOT NULL CHECK(game IN ('poe1', 'poe2'))"
      },
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const insert = db.prepare(`
    INSERT INTO profiles_next (
      id,
      name,
      game,
      data_json,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    const game = nullableGame ? null : (parseGame(row.game) ?? fallbackGame);
    insert.run(
      row.id,
      row.name,
      game,
      normalizeProfileDataGame(row.data_json, game),
      row.created_at,
      row.updated_at,
    );
  }

  db.exec(`
    DROP TABLE profiles;
    ALTER TABLE profiles_next RENAME TO profiles;
  `);
}

function updateProfileGameScope(db: DatabaseSync, game: GameId | null): void {
  const rows = readProfileRows(db);
  const update = db.prepare(`
    UPDATE profiles
    SET game = ?, data_json = ?
    WHERE id = ?
  `);

  for (const row of rows) {
    update.run(game, normalizeProfileDataGame(row.data_json, game), row.id);
  }
}

function readProfileRows(db: DatabaseSync): ProfileRow[] {
  return db
    .prepare(
      `
      SELECT id, name, game, data_json, created_at, updated_at
      FROM profiles
      ORDER BY updated_at DESC
    `,
    )
    .all() as unknown as ProfileRow[];
}

function profileGameColumnIsNullable(db: DatabaseSync): boolean {
  const row = (
    db.prepare("PRAGMA table_info(profiles)").all() as Array<{
      name: string;
      notnull: number;
    }>
  ).find((column) => column.name === "game");

  return row?.notnull === 0;
}

function tableExists(db: DatabaseSync, name: string): boolean {
  const row = db
    .prepare(
      `
      SELECT 1 AS found
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `,
    )
    .get(name) as { found: number } | undefined;

  return row !== undefined;
}

function normalizeProfileDataGame(
  dataJson: string,
  game: GameId | null,
): string {
  const data = parseObjectJson(dataJson);
  data.game = game;

  return JSON.stringify(data);
}

function parseObjectJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;

    return isObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseGame(value: string | null): GameId | null {
  return value === "poe1" || value === "poe2" ? value : null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export { migration_20260702_000000_aura_profiles_global_scope };
