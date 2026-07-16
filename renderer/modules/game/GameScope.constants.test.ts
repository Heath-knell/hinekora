import { describe, expect, it } from "vitest";

import { currentLeagueOptions, getCurrentLeague } from "~/types";
import {
  getFallbackLeague,
  getLeagueSettingKey,
  leagueOptions,
  normalizeLeagueForGame,
} from "./GameScope.constants";

describe("GameScope constants", () => {
  it("lists current selectable leagues per game", () => {
    expect(leagueOptions).toBe(currentLeagueOptions);
    expect(leagueOptions.poe1).toContain("Standard");
    expect(leagueOptions.poe2).toContain("Standard");
    expect(getCurrentLeague("poe1")).toBe("Standard");
    expect(getCurrentLeague("poe2")).toBe("Standard");
  });

  it("normalizes stale league selections to each game's fallback", () => {
    expect(getFallbackLeague("poe1")).toBe(getCurrentLeague("poe1"));
    expect(getFallbackLeague("poe2")).toBe(getCurrentLeague("poe2"));
    expect(getFallbackLeague("poe1", ["Mirage", "Standard"])).toBe("Mirage");
    expect(getFallbackLeague("poe2", ["Runes of Aldur", "Standard"])).toBe(
      "Runes of Aldur",
    );
    expect(normalizeLeagueForGame("poe1", getCurrentLeague("poe1"))).toBe(
      getCurrentLeague("poe1"),
    );
    expect(normalizeLeagueForGame("poe2", getCurrentLeague("poe2"))).toBe(
      getCurrentLeague("poe2"),
    );
    expect(normalizeLeagueForGame("poe1", "Standard")).toBe("Standard");
    expect(normalizeLeagueForGame("poe2", "Standard")).toBe("Standard");
    expect(normalizeLeagueForGame("poe1", "Mercenaries")).toBe(
      getCurrentLeague("poe1"),
    );
    expect(normalizeLeagueForGame("poe2", "Dawn of the Hunt")).toBe(
      getCurrentLeague("poe2"),
    );
  });

  it("maps games to their persisted league setting keys", () => {
    expect(getLeagueSettingKey("poe1")).toBe("poe1SelectedLeague");
    expect(getLeagueSettingKey("poe2")).toBe("poe2SelectedLeague");
  });
});
