import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260628_000000_editor_project_saved_edit_metadata } from "../migrations/20260628_000000_editor_project_saved_edit_metadata";
import {
  columnNames,
  indexExists,
  tableExists,
} from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Editor project saved edit metadata migration", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("keeps saved edit metadata migration idempotent on upgraded editor tables", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE editor_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        clip_count INTEGER NOT NULL DEFAULT 0,
        project_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO editor_projects (
        id,
        title,
        duration_seconds,
        clip_count,
        project_json,
        created_at,
        updated_at
      )
      VALUES (
        'project-1',
        'Boss edit',
        10,
        1,
        '{"sourceGame":"poe2","sourceLeague":"Runes of Aldur","history":{"editCount":2,"labels":["Split","Mute","Clear gaps"]},"assets":[{"assetKey":"clip:1","sourceGame":"poe1","sourceLeague":"Standard","sizeBytes":4096}],"tracks":[{"clips":[{"assetKey":"clip:1"}]}]}',
        '2026-06-18T00:00:00.000Z',
        '2026-06-18T00:00:00.000Z'
      ),
      (
        'project-2',
        'Asset scoped edit',
        10,
        1,
        '{"history":{"editCount":5,"labels":["Split"]},"assets":[{"assetKey":"clip:2","sourceGame":"poe1","sourceLeague":"Standard","sizeBytes":1024},{"assetKey":"clip:2","sourceGame":"poe1","sourceLeague":"Standard","sizeBytes":2048},{"assetKey":"clip:3","sourceGame":"poe1","sourceLeague":"Standard","sizeBytes":4096}],"tracks":[{"clips":[{"assetKey":"clip:2"},{"assetKey":"clip:3"}]}]}',
        '2026-06-18T00:00:00.000Z',
        '2026-06-18T00:00:00.000Z'
      ),
      (
        'project-3',
        'Mixed edit',
        10,
        1,
        '{"history":{"editCount":0,"labels":[]},"assets":[{"assetKey":"clip:4","sourceGame":"poe1","sourceLeague":"Standard","sizeBytes":100},{"assetKey":"clip:5","sourceGame":"poe2","sourceLeague":"Standard","sizeBytes":200}],"tracks":[{"clips":[{"assetKey":"clip:4"},{"assetKey":"clip:5"}]}]}',
        '2026-06-18T00:00:00.000Z',
        '2026-06-18T00:00:00.000Z'
      );
    `);

    migration_20260628_000000_editor_project_saved_edit_metadata.up(db);
    migration_20260628_000000_editor_project_saved_edit_metadata.up(db);

    expect(columnNames(db, "editor_projects")).toEqual(
      expect.arrayContaining([
        "history_edit_count",
        "source_game",
        "source_league",
        "source_size_bytes",
      ]),
    );
    expect(indexExists(db, "idx_editor_projects_saved_edits_all_updated")).toBe(
      true,
    );
    expect(indexExists(db, "idx_editor_projects_saved_edits_all_size")).toBe(
      true,
    );
    expect(tableExists(db, "editor_project_source_leagues")).toBe(true);
    expect(indexExists(db, "idx_editor_project_source_leagues_scope")).toBe(
      true,
    );
    expect(
      db
        .prepare(
          `
          SELECT id, source_game, source_league, source_size_bytes, history_edit_count
          FROM editor_projects
          ORDER BY id ASC
        `,
        )
        .all(),
    ).toEqual([
      {
        history_edit_count: 3,
        id: "project-1",
        source_game: "poe1",
        source_league: "Standard",
        source_size_bytes: 4096,
      },
      {
        history_edit_count: 5,
        id: "project-2",
        source_game: "poe1",
        source_league: "Standard",
        source_size_bytes: 6144,
      },
      {
        history_edit_count: 0,
        id: "project-3",
        source_game: null,
        source_league: "Standard",
        source_size_bytes: 300,
      },
    ]);
    expect(
      db
        .prepare(
          `
          SELECT project_id, source_game, source_league
          FROM editor_project_source_leagues
          ORDER BY project_id ASC, source_game ASC, source_league ASC
        `,
        )
        .all(),
    ).toEqual([
      {
        project_id: "project-1",
        source_game: "poe1",
        source_league: "Standard",
      },
      {
        project_id: "project-2",
        source_game: "poe1",
        source_league: "Standard",
      },
      {
        project_id: "project-3",
        source_game: "poe1",
        source_league: "Standard",
      },
      {
        project_id: "project-3",
        source_game: "poe2",
        source_league: "Standard",
      },
    ]);
  });

  it("rolls back saved edit metadata schema", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE editor_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        duration_seconds REAL NOT NULL DEFAULT 0,
        clip_count INTEGER NOT NULL DEFAULT 0,
        project_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    migration_20260628_000000_editor_project_saved_edit_metadata.up(db);
    migration_20260628_000000_editor_project_saved_edit_metadata.down(db);

    expect(tableExists(db, "editor_project_source_leagues")).toBe(false);
    expect(columnNames(db, "editor_projects")).not.toEqual(
      expect.arrayContaining([
        "history_edit_count",
        "source_game",
        "source_league",
        "source_size_bytes",
      ]),
    );
  });

  it("keeps saved edit metadata rollback idempotent before columns exist", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE editor_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        duration_seconds REAL NOT NULL DEFAULT 0,
        clip_count INTEGER NOT NULL DEFAULT 0,
        project_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    migration_20260628_000000_editor_project_saved_edit_metadata.down(db);

    expect(columnNames(db, "editor_projects")).toEqual([
      "id",
      "title",
      "duration_seconds",
      "clip_count",
      "project_json",
      "created_at",
      "updated_at",
    ]);
    expect(tableExists(db, "editor_project_source_leagues")).toBe(false);
  });

  it("backfills saved edit source league memberships when metadata columns already exist", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE editor_projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        duration_seconds REAL NOT NULL,
        clip_count INTEGER NOT NULL DEFAULT 0,
        history_edit_count INTEGER NOT NULL DEFAULT 0,
        project_json TEXT NOT NULL,
        source_game TEXT,
        source_league TEXT,
        source_size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO editor_projects (
        id,
        title,
        duration_seconds,
        clip_count,
        history_edit_count,
        project_json,
        source_game,
        source_league,
        source_size_bytes,
        created_at,
        updated_at
      )
      VALUES (
        'project-1',
        'Mixed league edit',
        10,
        2,
        1,
        '{"assets":[{"assetKey":"clip:1","sourceGame":"poe2","sourceLeague":"Standard","sizeBytes":100},{"assetKey":"clip:2","sourceGame":"poe2","sourceLeague":"Runes of Aldur","sizeBytes":200}],"tracks":[{"clips":[{"assetKey":"clip:1"},{"assetKey":"clip:2"}]}]}',
        'poe2',
        NULL,
        300,
        '2026-06-18T00:00:00.000Z',
        '2026-06-18T00:00:00.000Z'
      );
    `);

    migration_20260628_000000_editor_project_saved_edit_metadata.up(db);
    migration_20260628_000000_editor_project_saved_edit_metadata.up(db);

    expect(indexExists(db, "idx_editor_project_source_leagues_scope")).toBe(
      true,
    );
    expect(
      db
        .prepare(
          `
          SELECT project_id, source_game, source_league
          FROM editor_project_source_leagues
          ORDER BY source_league ASC
        `,
        )
        .all(),
    ).toEqual([
      {
        project_id: "project-1",
        source_game: "poe2",
        source_league: "Runes of Aldur",
      },
      {
        project_id: "project-1",
        source_game: "poe2",
        source_league: "Standard",
      },
    ]);
  });
});
