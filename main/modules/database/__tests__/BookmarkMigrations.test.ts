import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260608_000000_initial_schema } from "../migrations/20260608_000000_initial_schema";
import { migration_20260702_010000_bookmarks } from "../migrations/20260702_010000_bookmarks";
import {
  columnNames,
  indexColumns,
  indexExists,
  tableExists,
} from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Bookmark migrations", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("creates gameplay bookmark schema with activity sessions idempotently", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    migration_20260702_010000_bookmarks.up(db);
    migration_20260702_010000_bookmarks.up(db);

    expect(tableExists(db, "bookmarks")).toBe(true);
    expect(tableExists(db, "bookmark_links")).toBe(true);
    expect(tableExists(db, "activity_sessions")).toBe(true);
    expect(tableExists(db, "activity_session_clips")).toBe(true);
    expect(indexExists(db, "idx_bookmarks_library")).toBe(true);
    expect(indexExists(db, "idx_bookmarks_game_occurred_at")).toBe(true);
    expect(indexExists(db, "idx_bookmarks_dedupe")).toBe(false);
    expect(indexExists(db, "idx_bookmark_links_target_offset")).toBe(true);
    expect(indexExists(db, "idx_bookmark_links_bookmark")).toBe(true);
    expect(
      indexExists(db, "idx_activity_sessions_game_league_started_at"),
    ).toBe(true);
    expect(indexExists(db, "idx_activity_sessions_open")).toBe(true);
    expect(indexExists(db, "idx_activity_session_clips_session_offset")).toBe(
      true,
    );
    expect(indexExists(db, "idx_activity_session_clips_bookmark")).toBe(true);
    expect(indexColumns(db, "idx_bookmark_links_target_offset")).toEqual([
      { desc: false, name: "target_kind" },
      { desc: false, name: "target_id" },
      { desc: false, name: "archived" },
      { desc: false, name: "offset_seconds" },
    ]);

    db.prepare(
      `
      INSERT INTO bookmarks (
        id,
        source_game,
        source_league,
        source,
        category,
        label,
        occurred_at,
        dedupe_key,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "bookmark-1",
      "poe2",
      "Standard",
      "client-log",
      "map",
      "Qimah Reservoir",
      "2026-07-03T00:00:00.000Z",
      "dedupe-1",
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:00:00.000Z",
    );
    db.prepare(
      `
      INSERT INTO activity_sessions (
        id,
        mode,
        source_game,
        source_league,
        started_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "activity-session-1",
      "rewind",
      "poe2",
      "Standard",
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:00:00.000Z",
    );
    db.prepare(
      `
      INSERT INTO bookmark_links (
        id,
        bookmark_id,
        target_kind,
        target_id,
        offset_seconds,
        duration_seconds,
        archived,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      "bookmark-link-1",
      "bookmark-1",
      "activity-session",
      "activity-session-1",
      1.5,
      null,
      0,
      "2026-07-03T00:00:00.000Z",
      "2026-07-03T00:00:00.000Z",
    );

    expect(
      db
        .prepare("SELECT target_kind, offset_seconds FROM bookmark_links")
        .get(),
    ).toEqual({ offset_seconds: 1.5, target_kind: "activity-session" });
    expect(() =>
      db
        .prepare(
          `
          INSERT INTO bookmark_links (
            id,
            bookmark_id,
            target_kind,
            target_id,
            archived,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          "bookmark-link-invalid",
          "bookmark-1",
          "not-real",
          "activity-session-1",
          0,
          "2026-07-03T00:00:00.000Z",
          "2026-07-03T00:00:00.000Z",
        ),
    ).toThrow();

    migration_20260702_010000_bookmarks.down(db);

    expect(tableExists(db, "activity_session_clips")).toBe(false);
    expect(tableExists(db, "activity_sessions")).toBe(false);
    expect(tableExists(db, "bookmark_links")).toBe(false);
    expect(tableExists(db, "bookmarks")).toBe(false);
  });

  it("repairs existing activity sessions missing counter columns before indexes", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE activity_sessions (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL CHECK(mode IN ('rewind')),
        source_game TEXT NOT NULL CHECK(source_game IN ('poe1', 'poe2')),
        source_league TEXT NOT NULL,
        started_at TEXT NOT NULL,
        stopped_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      INSERT INTO activity_sessions (
        id,
        mode,
        source_game,
        source_league,
        started_at,
        created_at,
        updated_at
      )
      VALUES (
        'activity-session-1',
        'rewind',
        'poe2',
        'Standard',
        '2026-07-03T00:00:00.000Z',
        '2026-07-03T00:00:00.000Z',
        '2026-07-03T00:00:00.000Z'
      );
    `);

    migration_20260702_010000_bookmarks.up(db);
    migration_20260702_010000_bookmarks.up(db);

    expect(columnNames(db, "activity_sessions")).toEqual(
      expect.arrayContaining(["bookmark_count", "clip_count"]),
    );
    expect(
      db
        .prepare(
          `
          SELECT bookmark_count, clip_count
          FROM activity_sessions
          WHERE id = ?
        `,
        )
        .get("activity-session-1"),
    ).toEqual({ bookmark_count: 0, clip_count: 0 });
    expect(indexExists(db, "idx_activity_sessions_game_bookmark_count")).toBe(
      true,
    );
    expect(indexExists(db, "idx_activity_sessions_game_clip_count")).toBe(true);
  });

  it("creates bookmark activity session sort indexes idempotently", () => {
    const db = createDatabase();

    migration_20260608_000000_initial_schema.up(db);
    migration_20260702_010000_bookmarks.up(db);
    migration_20260702_010000_bookmarks.up(db);

    expect(indexExists(db, "idx_activity_sessions_game_started_at")).toBe(true);
    expect(indexColumns(db, "idx_activity_sessions_game_started_at")).toEqual([
      { desc: false, name: "source_game" },
      { desc: true, name: "started_at" },
    ]);
    expect(indexExists(db, "idx_activity_sessions_game_bookmark_count")).toBe(
      true,
    );
    expect(indexExists(db, "idx_activity_sessions_game_clip_count")).toBe(true);
    expect(
      indexColumns(db, "idx_activity_sessions_mode_game_league_bookmark_count"),
    ).toEqual([
      { desc: false, name: "mode" },
      { desc: false, name: "source_game" },
      { desc: false, name: "source_league" },
      { desc: true, name: "bookmark_count" },
      { desc: true, name: "started_at" },
    ]);
    expect(
      indexColumns(db, "idx_activity_sessions_mode_game_league_clip_count"),
    ).toEqual([
      { desc: false, name: "mode" },
      { desc: false, name: "source_game" },
      { desc: false, name: "source_league" },
      { desc: true, name: "clip_count" },
      { desc: true, name: "started_at" },
    ]);
    expect(
      indexExists(db, "idx_activity_sessions_mode_game_league_started_at"),
    ).toBe(true);

    migration_20260702_010000_bookmarks.down(db);
    expect(indexExists(db, "idx_activity_sessions_game_started_at")).toBe(
      false,
    );
  });
});
