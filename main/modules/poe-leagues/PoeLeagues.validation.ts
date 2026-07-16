import {
  type PoeLeagueProviderRecord,
  PoeLeagueProviderRecordSchema,
} from "~/types";

function validateProviderLeagues(
  value: readonly PoeLeagueProviderRecord[],
): PoeLeagueProviderRecord[] {
  const leagues = PoeLeagueProviderRecordSchema.array().max(50).parse(value);
  const ids = new Set(leagues.map((league) => league.id));
  if (ids.size !== leagues.length) {
    throw new Error("League provider returned duplicate ids");
  }

  const names = new Set(leagues.map((league) => league.name));
  if (names.size !== leagues.length) {
    throw new Error("League provider returned duplicate names");
  }

  if (leagues.filter((league) => league.isCurrent).length !== 1) {
    throw new Error("League provider must return exactly one current league");
  }

  return leagues;
}

function getCurrentLeagueName(
  leagues: readonly Pick<PoeLeagueProviderRecord, "isCurrent" | "name">[],
): string | null {
  return leagues.find((league) => league.isCurrent)?.name ?? null;
}

function formatLeagueNames(
  leagues: readonly Pick<PoeLeagueProviderRecord, "name">[],
): string {
  return leagues.map((league) => league.name).join(", ");
}

export { formatLeagueNames, getCurrentLeagueName, validateProviderLeagues };
