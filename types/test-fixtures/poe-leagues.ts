import type { GameId, PoeLeague } from "../index";

function createPoeLeagueFixtureCatalog(): Record<GameId, PoeLeague[]> {
  return {
    poe1: [
      {
        endAt: null,
        id: "Mirage",
        isActive: true,
        isCurrent: true,
        name: "Mirage",
        startAt: null,
        updatedAt: null,
      },
      {
        endAt: null,
        id: "Standard",
        isActive: true,
        isCurrent: false,
        name: "Standard",
        startAt: null,
        updatedAt: null,
      },
    ],
    poe2: [
      {
        endAt: null,
        id: "Runes of Aldur",
        isActive: true,
        isCurrent: true,
        name: "Runes of Aldur",
        startAt: null,
        updatedAt: null,
      },
      {
        endAt: null,
        id: "Standard",
        isActive: true,
        isCurrent: false,
        name: "Standard",
        startAt: null,
        updatedAt: null,
      },
    ],
  };
}

export { createPoeLeagueFixtureCatalog };
