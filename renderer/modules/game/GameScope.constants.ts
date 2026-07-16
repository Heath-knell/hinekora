import {
  currentLeagueOptions,
  type GameId,
  getCurrentLeague,
  getLeagueSettingKey,
} from "~/types";

export const gameOptions: Array<{ id: GameId; label: string }> = [
  { id: "poe1", label: "Path of Exile 1" },
  { id: "poe2", label: "Path of Exile 2" },
];

export function getGameLabel(game: GameId): string {
  return gameOptions.find((option) => option.id === game)?.label ?? game;
}

export const leagueOptions: Record<GameId, readonly string[]> =
  currentLeagueOptions;

export function getFallbackLeague(
  game: GameId,
  leagues: readonly string[] = leagueOptions[game],
): string {
  return leagues[0] ?? getCurrentLeague(game);
}

export function normalizeLeagueForGame(
  game: GameId,
  league: string | null | undefined,
  leagues: readonly string[] = leagueOptions[game],
): string {
  return league && leagues.includes(league)
    ? league
    : getFallbackLeague(game, leagues);
}

export { getLeagueSettingKey };
