import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260711_000000_poe_leagues } from "../migrations/20260711_000000_poe_leagues";
import { indexExists, tableExists } from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  return database;
}

function createPartialLeagueCatalog(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE poe_leagues (
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
  `);
}

describe("PoE leagues migration", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("creates and seeds the league catalog idempotently", () => {
    const db = createDatabase();

    migration_20260711_000000_poe_leagues.up(db);
    migration_20260711_000000_poe_leagues.up(db);

    expect(tableExists(db, "poe_leagues")).toBe(true);
    expect(tableExists(db, "poe_league_sync_state")).toBe(true);
    expect(indexExists(db, "idx_poe_leagues_game_active")).toBe(true);
    expect(indexExists(db, "idx_poe_leagues_one_current_per_game")).toBe(true);
    expect(
      db
        .prepare(
          "SELECT game, id, is_current FROM poe_leagues ORDER BY game, is_current DESC, id",
        )
        .all(),
    ).toEqual([
      { game: "poe1", id: "Standard", is_current: 1 },
      { game: "poe2", id: "Standard", is_current: 1 },
    ]);
  });

  it("does not overwrite provider-owned rows when rerun", () => {
    const db = createDatabase();
    migration_20260711_000000_poe_leagues.up(db);
    db.prepare(
      "UPDATE poe_leagues SET name = ?, source_updated_at = ? WHERE game = ? AND id = ?",
    ).run("Standard (remote)", "2026-07-12T00:00:00.000Z", "poe1", "Standard");

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare(
          "SELECT name, source_updated_at FROM poe_leagues WHERE game = ? AND id = ?",
        )
        .get("poe1", "Standard"),
    ).toEqual({
      name: "Standard (remote)",
      source_updated_at: "2026-07-12T00:00:00.000Z",
    });
  });

  it("preserves an existing current league while adding Standard", () => {
    const db = createDatabase();
    createPartialLeagueCatalog(db);
    db.prepare(
      `INSERT INTO poe_leagues (
        game, id, name, start_at, end_at, is_active, is_current,
        source_updated_at, synced_at, created_at
      ) VALUES (?, ?, ?, ?, NULL, 1, 1, NULL, ?, ?)`,
    ).run(
      "poe1",
      "Mirage",
      "Mirage",
      "2026-06-01T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
    );

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare(
          "SELECT id, is_active, is_current FROM poe_leagues WHERE game = ? ORDER BY id",
        )
        .all("poe1"),
    ).toEqual([
      { id: "Mirage", is_active: 1, is_current: 1 },
      { id: "Standard", is_active: 1, is_current: 0 },
    ]);
  });

  it("repairs duplicate current leagues before creating the unique index", () => {
    const db = createDatabase();
    createPartialLeagueCatalog(db);
    const insert = db.prepare(
      `INSERT INTO poe_leagues (
        game, id, name, start_at, end_at, is_active, is_current,
        source_updated_at, synced_at, created_at
      ) VALUES (?, ?, ?, ?, NULL, 1, 1, NULL, ?, ?)`,
    );
    insert.run(
      "poe1",
      "Older League",
      "Older League",
      "2026-01-01T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
    );
    insert.run(
      "poe1",
      "Newer League",
      "Newer League",
      "2026-06-01T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
    );

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare(
          "SELECT id FROM poe_leagues WHERE game = ? AND is_active = 1 AND is_current = 1",
        )
        .all("poe1"),
    ).toEqual([{ id: "Newer League" }]);
    expect(indexExists(db, "idx_poe_leagues_one_current_per_game")).toBe(true);
  });

  it("reactivates an existing Standard row when no current league exists", () => {
    const db = createDatabase();
    createPartialLeagueCatalog(db);
    db.prepare(
      `INSERT INTO poe_leagues (
        game, id, name, start_at, end_at, is_active, is_current,
        source_updated_at, synced_at, created_at
      ) VALUES (?, ?, ?, NULL, NULL, 0, 0, ?, ?, ?)`,
    ).run(
      "poe2",
      "Standard",
      "Standard (remote)",
      "2026-07-10T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
      "2026-07-10T00:00:00.000Z",
    );

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare(
          "SELECT name, is_active, is_current, source_updated_at FROM poe_leagues WHERE game = ? AND id = ?",
        )
        .get("poe2", "Standard"),
    ).toEqual({
      name: "Standard (remote)",
      is_active: 1,
      is_current: 1,
      source_updated_at: "2026-07-10T00:00:00.000Z",
    });
  });

  it("tolerates rollback before settings were backed up", () => {
    const db = createDatabase();

    expect(() => migration_20260711_000000_poe_leagues.down(db)).not.toThrow();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    expect(() => migration_20260711_000000_poe_leagues.down(db)).not.toThrow();
  });

  it("preserves unrelated settings while releasing unfinished league defaults", () => {
    const db = createDatabase();
    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO settings VALUES
        ('setupCompleted', 'false', '2026-07-11T00:00:00.000Z'),
        ('poe1MediaLibraryLeague', '"Mirage"', '2026-07-11T00:00:00.000Z'),
        ('poe2MediaLibraryLeague', '"Runes of Aldur"', '2026-07-11T00:00:00.000Z'),
        ('unrelatedSetting', '"preserved"', '2026-07-11T00:00:00.000Z');
    `);

    migration_20260711_000000_poe_leagues.up(db);

    expect(
      db
        .prepare("SELECT value_json FROM settings WHERE key = ?")
        .get("unrelatedSetting"),
    ).toEqual({ value_json: '"preserved"' });
    expect(
      db
        .prepare("SELECT 1 FROM settings WHERE key = ?")
        .get("poe1MediaLibraryLeague"),
    ).toBeUndefined();
  });
});
