import {
  type AppSettings,
  type AppSettingsUpdate,
  getLeagueSettingKey,
} from "~/types";

function normalizeLeagueSettingsUpdate(
  current: AppSettings,
  input: AppSettingsUpdate,
): AppSettingsUpdate {
  const activeGame = input.activeGame ?? current.activeGame;
  const activeLeagueKey = getLeagueSettingKey(activeGame);
  const normalized = { ...input };

  // Accept the legacy activeLeague field from older renderers/state snapshots,
  // but immediately move that intent into the canonical per-game selection.
  if (
    Object.hasOwn(input, "activeLeague") &&
    !Object.hasOwn(input, activeLeagueKey) &&
    input.activeLeague
  ) {
    normalized[activeLeagueKey] = input.activeLeague;
  }

  if (
    Object.hasOwn(input, "activeGame") ||
    Object.hasOwn(input, "activeLeague") ||
    Object.hasOwn(input, activeLeagueKey)
  ) {
    normalized.activeLeague =
      normalized[activeLeagueKey] ?? current[activeLeagueKey];
  }

  return normalized;
}

export { normalizeLeagueSettingsUpdate };
