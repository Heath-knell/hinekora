import type { DatabaseSync } from "node:sqlite";

import type { Migration } from "../migrations";

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

function indexExists(db: DatabaseSync, name: string): boolean {
  const row = db
    .prepare(
      `
      SELECT 1 AS found
      FROM sqlite_master
      WHERE type = 'index' AND name = ?
    `,
    )
    .get(name) as { found: number } | undefined;

  return row !== undefined;
}

function indexColumns(
  db: DatabaseSync,
  name: string,
): Array<{ desc: boolean; name: string }> {
  return db
    .prepare(`PRAGMA index_xinfo(${name})`)
    .all()
    .filter((row) => (row as { key: number }).key === 1)
    .sort(
      (left, right) =>
        (left as { seqno: number }).seqno - (right as { seqno: number }).seqno,
    )
    .map((row) => {
      const typedRow = row as { desc: number; name: string };

      return { desc: typedRow.desc === 1, name: typedRow.name };
    });
}

function columnNames(db: DatabaseSync, table: string): string[] {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => (row as { name: string }).name);
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

function readSettings(db: DatabaseSync): Record<string, unknown> {
  const rows = db
    .prepare("SELECT key, value_json FROM settings")
    .all() as Array<{
    key: string;
    value_json: string;
  }>;

  return Object.fromEntries(
    rows.map((row) => [row.key, JSON.parse(row.value_json)]),
  );
}

function readCaptureProfiles(db: DatabaseSync): Array<{
  data: Record<string, unknown>;
  game: string;
  id: string;
  name: string;
}> {
  const rows = db
    .prepare(
      `
      SELECT id, name, game, data_json
      FROM capture_profiles
      ORDER BY game ASC, id ASC
    `,
    )
    .all() as Array<{
    data_json: string;
    game: string;
    id: string;
    name: string;
  }>;

  return rows.map((row) => ({
    data: JSON.parse(row.data_json) as Record<string, unknown>,
    game: row.game,
    id: row.id,
    name: row.name,
  }));
}

function insertSetting(
  db: DatabaseSync,
  key: string,
  value: unknown,
  updatedAt = "2026-07-01T00:00:00.000Z",
): void {
  db.prepare(
    "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?)",
  ).run(key, JSON.stringify(value), updatedAt);
}

function createTableMigration(id: string): Migration {
  return {
    id,
    description: `Create ${id}`,
    up(db) {
      db.exec(`CREATE TABLE ${id} (id TEXT PRIMARY KEY)`);
    },
    down(db) {
      db.exec(`DROP TABLE ${id}`);
    },
  };
}

export {
  columnNames,
  createTableMigration,
  indexColumns,
  indexExists,
  insertSetting,
  profileGameColumnIsNullable,
  readCaptureProfiles,
  readSettings,
  tableExists,
};
