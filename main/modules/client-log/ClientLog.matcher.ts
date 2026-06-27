import { createHash } from "node:crypto";

const DEFAULT_DEATH_PATTERNS = [/\bhas been slain\b/i, /\bwas slain\b/i];
const IGNORED_CHAT_PREFIXES = new Set(["#", "%", "$"]);
const FOCUS_GAINED_MESSAGE = "[WINDOW] Gained focus";
const FOCUS_LOST_MESSAGE = "[WINDOW] Lost focus";
const LOG_FILE_OPENING_MARKER = "***** LOG FILE OPENING *****";
const CLOSING_GAME_MESSAGE = "Closing game gracefully";

interface ClientLogFocusEvent {
  focused: boolean;
  line: string;
}

interface ClientLogParseOptions {
  characterName?: string | null;
}

interface ParsedClientLogEvents {
  deathLines: string[];
  focusEvents: ClientLogFocusEvent[];
}

function extractMessage(line: string): string {
  const messageStart = line.indexOf("]");

  return messageStart === -1 ? line : line.slice(messageStart + 1);
}

function isIgnoredChatMessage(message: string): boolean {
  return IGNORED_CHAT_PREFIXES.has(message[0] ?? "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesConfiguredCharacterDeath(
  message: string,
  characterName: string,
): boolean {
  const trimmedCharacterName = characterName.trim();
  if (!trimmedCharacterName) {
    return true;
  }

  const characterPattern = new RegExp(
    `(?:^|:\\s*)${escapeRegExp(trimmedCharacterName)}\\s+(?:has been slain|was slain)\\.?$`,
    "i",
  );

  return characterPattern.test(message);
}

function parseClientLogEvents(
  text: string,
  options: ClientLogParseOptions = {},
): ParsedClientLogEvents {
  const deathLines: string[] = [];
  const focusEvents: ClientLogFocusEvent[] = [];
  const characterName = options.characterName?.trim() ?? "";

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.includes(LOG_FILE_OPENING_MARKER)) {
      focusEvents.push({ focused: true, line });
      continue;
    }

    const message = extractMessage(line).trim();

    if (message === FOCUS_GAINED_MESSAGE) {
      focusEvents.push({ focused: true, line });
    } else if (message === FOCUS_LOST_MESSAGE) {
      focusEvents.push({ focused: false, line });
    } else if (message === CLOSING_GAME_MESSAGE) {
      focusEvents.push({ focused: false, line });
    }

    if (
      !isIgnoredChatMessage(message) &&
      DEFAULT_DEATH_PATTERNS.some((pattern) => pattern.test(line)) &&
      matchesConfiguredCharacterDeath(message, characterName)
    ) {
      deathLines.push(line);
    }
  }

  return { deathLines, focusEvents };
}

function findDeathLines(
  text: string,
  options: ClientLogParseOptions = {},
): string[] {
  return parseClientLogEvents(text, options).deathLines;
}

function findFocusEvents(text: string): ClientLogFocusEvent[] {
  return parseClientLogEvents(text).focusEvents;
}

function findLatestFocusState(text: string): boolean | null {
  let latest: boolean | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.includes(LOG_FILE_OPENING_MARKER)) {
      latest = true;
      continue;
    }

    const message = extractMessage(line).trim();
    if (message === FOCUS_GAINED_MESSAGE) {
      latest = true;
    } else if (message === FOCUS_LOST_MESSAGE) {
      latest = false;
    } else if (message === CLOSING_GAME_MESSAGE) {
      latest = false;
    }
  }

  return latest;
}

function hashDeathLine(line: string): string {
  return createHash("sha256").update(line).digest("hex").slice(0, 32);
}

export type {
  ClientLogFocusEvent,
  ClientLogParseOptions,
  ParsedClientLogEvents,
};
export {
  findDeathLines,
  findFocusEvents,
  findLatestFocusState,
  hashDeathLine,
  parseClientLogEvents,
};
