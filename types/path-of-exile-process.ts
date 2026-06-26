import type { GameId } from "./schemas";

const AMBIGUOUS_PATH_OF_EXILE_PROCESS_NAMES = new Set([
  "pathofexile.exe",
  "pathofexilesteam.exe",
]);
const PATH_OF_EXILE_1_PROCESS_NAMES = new Set([
  "pathofexile_x64.exe",
  "pathofexile_x64steam.exe",
]);

function isAmbiguousPathOfExileProcessName(processName: string): boolean {
  return AMBIGUOUS_PATH_OF_EXILE_PROCESS_NAMES.has(processName.toLowerCase());
}

function resolvePathOfExileProcessGame(processName: string): GameId | null {
  const normalized = processName.toLowerCase();
  if (!normalized.includes("pathofexile")) {
    return null;
  }

  if (isAmbiguousPathOfExileProcessName(processName)) {
    return null;
  }

  return PATH_OF_EXILE_1_PROCESS_NAMES.has(normalized) ? "poe1" : null;
}

export { isAmbiguousPathOfExileProcessName, resolvePathOfExileProcessGame };
