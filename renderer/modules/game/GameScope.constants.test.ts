import { describe, expect, it } from "vitest";

import {
  getFallbackLeague,
  getLeagueSettingKey,
  leagueOptions,
  normalizeLeagueForGame,
} from "./GameScope.constants";

describe("GameScope constants", () => {
  it("lists current selectable leagues per game", () => {
    expect(leagueOptions).toEqual({
      poe1: ["Standard", "Mirage"],
      poe2: ["Standard", "Runes of Aldur"],
    });
  });

  it("normalizes stale league selections to each game's fallback", () => {
    expect(getFallbackLeague("poe1")).toBe("Standard");
    expect(getFallbackLeague("poe2")).toBe("Standard");
    expect(normalizeLeagueForGame("poe1", "Mirage")).toBe("Mirage");
    expect(normalizeLeagueForGame("poe2", "Runes of Aldur")).toBe(
      "Runes of Aldur",
    );
    expect(normalizeLeagueForGame("poe1", "Mercenaries")).toBe("Standard");
    expect(normalizeLeagueForGame("poe2", "Dawn of the Hunt")).toBe("Standard");
  });

  it("maps games to their persisted league setting keys", () => {
    expect(getLeagueSettingKey("poe1")).toBe("poe1SelectedLeague");
    expect(getLeagueSettingKey("poe2")).toBe("poe2SelectedLeague");
  });
});
