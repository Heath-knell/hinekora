import type { Migration } from "./Migration.interface";

const migration_20260625_000000_media_library_sort_indexes: Migration = {
  id: "20260625_000000_media_library_sort_indexes",
  description: "Add media library sort indexes",
  up(db) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_replay_clips_library_created
        ON replay_clips(source_game, source_league, kind, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_replay_clips_library_duration
        ON replay_clips(source_game, source_league, kind, target_duration_seconds);

      CREATE INDEX IF NOT EXISTS idx_run_recordings_library_created
        ON run_recordings(source_game, source_league, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_run_recordings_library_name
        ON run_recordings(source_game, source_league, file_name);
    `);
  },
  down(db) {
    db.exec(`
      DROP INDEX IF EXISTS idx_run_recordings_library_name;
      DROP INDEX IF EXISTS idx_run_recordings_library_created;
      DROP INDEX IF EXISTS idx_replay_clips_library_duration;
      DROP INDEX IF EXISTS idx_replay_clips_library_created;
    `);
  },
};

export { migration_20260625_000000_media_library_sort_indexes };
