import { describe, expect, it } from "vitest";

import { classifyBookmarkLocation } from "../Bookmarks.classifier";

describe("Bookmarks classifier", () => {
  it("classifies special scene and area identifiers", () => {
    expect(
      classifyBookmarkLocation({
        areaId: "Abyss_Depths1",
        sceneName: "Abyssal Depths",
      }),
    ).toEqual({ category: "map", subcategory: "abyss-depths" });
    expect(
      classifyBookmarkLocation({
        areaId: "Sanctum_3_Foyer_3",
        sceneName: "Trial of the Sekhemas",
      }),
    ).toEqual({ category: "map", subcategory: "trial" });
    expect(
      classifyBookmarkLocation({
        areaId: "MapUberBoss_Divinity",
        sceneName: "The Origin Tower",
      }),
    ).toEqual({ category: "pinnacle", subcategory: null });
    expect(
      classifyBookmarkLocation({
        areaId: "ExpeditionSubArea_OlrothBoss",
        sceneName: "The Logbook",
      }),
    ).toEqual({ category: "boss", subcategory: null });
  });

  it("keeps map hideout unlocks as maps but personal hideouts as hideouts", () => {
    expect(
      classifyBookmarkLocation({
        areaId: "MapHideoutCanal_Claimable",
        sceneName: "Canal Hideout",
      }),
    ).toEqual({ category: "map", subcategory: null });
    expect(
      classifyBookmarkLocation({
        areaId: "HideoutFelled",
        sceneName: "Felled Hideout",
      }),
    ).toEqual({ category: "hideout", subcategory: null });
    expect(
      classifyBookmarkLocation({
        areaId: "MapWorldsPromenade",
        sceneName: "Atlas Hideout",
      }),
    ).toEqual({ category: "hideout", subcategory: null });
  });

  it("falls back to map when no area id is available", () => {
    expect(
      classifyBookmarkLocation({
        areaId: null,
        sceneName: "Unknown Map",
      }),
    ).toEqual({ category: "map", subcategory: null });
  });
});
