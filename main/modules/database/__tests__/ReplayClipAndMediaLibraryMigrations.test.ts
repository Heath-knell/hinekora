import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { migration_20260618_000000_replay_clip_kind } from "../migrations/20260618_000000_replay_clip_kind";
import { migration_20260620_000000_media_library_performance } from "../migrations/20260620_000000_media_library_performance";
import { columnNames, indexExists } from "./MigrationRunner.test-utils";

let database: DatabaseSync | null = null;

function createDatabase(): DatabaseSync {
  database = new DatabaseSync(":memory:");
  return database;
}

describe("Replay clip and media library migrations", () => {
  afterEach(() => {
    database?.close();
    database = null;
  });

  it("adds replay clip kind to pre-existing replay clip tables", () => {
    const db = createDatabase();
    db.exec(`
      CREATE TABLE replay_clips (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        source_game TEXT NOT NULL,
        source_league TEXT NOT NULL DEFAULT 'Standard',
        death_timestamp TEXT NOT NULL,
        trigger_line_hash TEXT NOT NULL,
        original_obs_path TEXT,
        processed_clip_path TEXT,
        target_duration_seconds INTEGER NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    migration_20260618_000000_replay_clip_kind.up(db);

    expect(columnNames(db, "replay_clips")).toContain("kind");
    expect(
      indexExists(db, "idx_replay_clips_kind_game_league_created_at"),
    ).toBe(true);
  });

  it("keeps media library performance migration idempotent on upgraded tables", () => {
    const db = createDatabase();

    db.exec(`
      CREATE TABLE replay_clips (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT 'death',
        source_game TEXT NOT NULL DEFAULT 'poe2',
        source_league TEXT NOT NULL DEFAULT 'Standard',
        size_bytes INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE run_recordings (
        id TEXT PRIMARY KEY,
        source_game TEXT NOT NULL,
        source_league TEXT NOT NULL,
        duration_seconds INTEGER,
        exists_on_disk INTEGER NOT NULL DEFAULT 0,
        file_name TEXT NOT NULL DEFAULT '',
        mtime_ms INTEGER NOT NULL DEFAULT 0,
        size_bytes INTEGER NOT NULL DEFAULT 0
      );
    `);

    migration_20260620_000000_media_library_performance.up(db);

    expect(columnNames(db, "replay_clips")).toContain("size_bytes");
    expect(columnNames(db, "run_recordings")).toEqual(
      expect.arrayContaining([
        "duration_seconds",
        "exists_on_disk",
        "file_name",
        "mtime_ms",
        "size_bytes",
      ]),
    );
    expect(indexExists(db, "idx_run_recordings_cleanup")).toBe(true);
  });
});
