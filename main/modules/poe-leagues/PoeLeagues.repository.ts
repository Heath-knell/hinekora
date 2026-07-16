import type { DatabaseService } from "~/main/modules/database";

import type { GameId, PoeLeague, PoeLeagueProviderRecord } from "~/types";
import { mapPoeLeagueRow } from "./PoeLeagues.mapper";

interface PoeLeagueSyncState {
  lastSyncedAt: string;
  provider: string;
}

class PoeLeaguesRepository {
  constructor(private readonly database: DatabaseService) {}

  listActive(game: GameId): PoeLeague[] {
    const rows = this.database.queryAll(
      this.database.kysely
        .selectFrom("poe_leagues")
        .selectAll()
        .where("game", "=", game)
        .where("is_active", "=", 1)
        .orderBy("is_current", "desc")
        .orderBy("name", "asc"),
    );

    return rows.flatMap((row) => {
      const league = mapPoeLeagueRow(row);

      return league ? [league] : [];
    });
  }

  getCurrent(game: GameId): PoeLeague | null {
    const row = this.database.queryOne(
      this.database.kysely
        .selectFrom("poe_leagues")
        .selectAll()
        .where("game", "=", game)
        .where("is_active", "=", 1)
        .where("is_current", "=", 1),
    );

    return row ? mapPoeLeagueRow(row) : null;
  }

  getSyncState(game: GameId): PoeLeagueSyncState | null {
    const row = this.database.queryOne(
      this.database.kysely
        .selectFrom("poe_league_sync_state")
        .selectAll()
        .where("game", "=", game),
    );

    return row
      ? { lastSyncedAt: row.last_synced_at, provider: row.provider }
      : null;
  }

  replaceActive(
    game: GameId,
    leagues: readonly PoeLeagueProviderRecord[],
    provider: string,
    syncedAt: string,
  ): void {
    this.database.transaction(() => {
      this.database.runQuery(
        this.database.kysely
          .updateTable("poe_leagues")
          .set({ is_active: 0, is_current: 0, synced_at: syncedAt })
          .where("game", "=", game),
      );

      for (const league of leagues) {
        this.database.runQuery(
          this.database.kysely
            .insertInto("poe_leagues")
            .values({
              created_at: syncedAt,
              end_at: league.endAt,
              game,
              id: league.id,
              is_active: 1,
              is_current: league.isCurrent ? 1 : 0,
              name: league.name,
              source_updated_at: league.updatedAt,
              start_at: league.startAt,
              synced_at: syncedAt,
            })
            .onConflict((conflict) =>
              conflict.columns(["game", "id"]).doUpdateSet({
                end_at: league.endAt,
                is_active: 1,
                is_current: league.isCurrent ? 1 : 0,
                name: league.name,
                source_updated_at: league.updatedAt,
                start_at: league.startAt,
                synced_at: syncedAt,
              }),
            ),
        );
      }

      this.database.runQuery(
        this.database.kysely
          .insertInto("poe_league_sync_state")
          .values({ game, last_synced_at: syncedAt, provider })
          .onConflict((conflict) =>
            conflict.column("game").doUpdateSet({
              last_synced_at: syncedAt,
              provider,
            }),
          ),
      );
    });
  }
}

export { PoeLeaguesRepository };
