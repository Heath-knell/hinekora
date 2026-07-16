import { z } from "zod";

import { type GameId, gameIds, type PoeLeagueProviderRecord } from "~/types";

const NullableTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .nullable();
const SupabaseLeagueRowSchema = z
  .object({
    endAt: NullableTimestampSchema,
    game: z.enum(gameIds),
    id: z.string().min(1).max(128),
    isActive: z.boolean(),
    isCurrent: z.boolean().optional(),
    leagueId: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    startAt: NullableTimestampSchema,
    updatedAt: NullableTimestampSchema,
  })
  .strict();
const SupabaseLeaguesResponseSchema = z
  .object({
    leagues: SupabaseLeagueRowSchema.array().max(50),
  })
  .strict();

type SupabaseLeagueRow = z.infer<typeof SupabaseLeagueRowSchema>;

function mapSupabaseLeagueResponse(
  value: unknown,
  game: GameId,
): PoeLeagueProviderRecord[] {
  const response = SupabaseLeaguesResponseSchema.parse(value);
  return normalizeSupabaseLeagueRows(response.leagues, game);
}

function normalizeSupabaseLeagueRows(
  leagues: readonly SupabaseLeagueRow[],
  game: GameId,
): PoeLeagueProviderRecord[] {
  const activeLeagues = leagues.filter(
    (league) => league.game === game && league.isActive,
  );
  const hasEndpointCurrentLeagueFlags = activeLeagues.some((league) =>
    Object.hasOwn(league, "isCurrent"),
  );
  const inferredCurrentLeague = hasEndpointCurrentLeagueFlags
    ? null
    : selectCurrentLeague(activeLeagues);

  return activeLeagues.map((league) => ({
    endAt: league.endAt,
    id: league.leagueId,
    isCurrent: hasEndpointCurrentLeagueFlags
      ? league.isCurrent === true
      : league.leagueId === inferredCurrentLeague?.leagueId,
    name: league.name,
    startAt: league.startAt,
    updatedAt: league.updatedAt,
  }));
}

function selectCurrentLeague(
  leagues: readonly SupabaseLeagueRow[],
): SupabaseLeagueRow | null {
  if (leagues.length === 0) {
    return null;
  }

  const nonStandardLeagues = leagues.filter(
    (league) => !isStandardLeague(league),
  );
  const candidates =
    nonStandardLeagues.length > 0 ? nonStandardLeagues : leagues;

  return candidates.reduce((current, league) =>
    getTimestampSortValue(league.startAt) >
    getTimestampSortValue(current.startAt)
      ? league
      : current,
  );
}

function getTimestampSortValue(value: string | null): number {
  return value ? Date.parse(value) : Number.NEGATIVE_INFINITY;
}

function isStandardLeague(league: SupabaseLeagueRow): boolean {
  return (
    league.leagueId.toLowerCase() === "standard" ||
    league.name.toLowerCase() === "standard"
  );
}

export { mapSupabaseLeagueResponse, normalizeSupabaseLeagueRows };
