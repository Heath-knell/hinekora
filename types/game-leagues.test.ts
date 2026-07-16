import { describe, expect, it } from "vitest";

import {
  canNormalizePoeLeagueSelection,
  createActivePoeLeagueCatalog,
  currentLeagueOptions,
  getCurrentLeague,
  getLeagueSettingKey,
  getMediaLibraryLeagueSettingKey,
  PoeLeaguesUserIdResultSchema,
  resolveCurrentLeagueName,
} from "./game-leagues";

describe("game league helpers", () => {
  it("creates active league catalogs from fallback leagues", () => {
    expect(createActivePoeLeagueCatalog()).toEqual({
      poe1: [expect.objectContaining({ id: "Standard", isActive: true })],
      poe2: [expect.objectContaining({ id: "Standard", isActive: true })],
    });
    expect(currentLeagueOptions).toEqual({
      poe1: ["Standard"],
      poe2: ["Standard"],
    });
    expect(getCurrentLeague("poe1")).toBe("Standard");
  });

  it("bounds previous pseudonymous identities exposed for privacy requests", () => {
    expect(
      PoeLeaguesUserIdResultSchema.safeParse({
        previousUserIds: ["previous-user-id"],
        userId: "current-user-id",
      }).success,
    ).toBe(true);
    expect(
      PoeLeaguesUserIdResultSchema.safeParse({
        previousUserIds: Array.from(
          { length: 6 },
          (_, index) => `user-${index}`,
        ),
        userId: null,
      }).success,
    ).toBe(false);
  });

  it("resolves selected and media library setting keys per game", () => {
    expect(getLeagueSettingKey("poe1")).toBe("poe1SelectedLeague");
    expect(getLeagueSettingKey("poe2")).toBe("poe2SelectedLeague");
    expect(getMediaLibraryLeagueSettingKey("poe1")).toBe(
      "poe1MediaLibraryLeague",
    );
    expect(getMediaLibraryLeagueSettingKey("poe2")).toBe(
      "poe2MediaLibraryLeague",
    );
  });

  it("falls back to Standard when a catalog has no current marker", () => {
    expect(
      resolveCurrentLeagueName([{ isCurrent: false, name: "Hardcore" }]),
    ).toBe("Standard");
  });

  it("normalizes selections only after a catalog has synced", () => {
    expect(canNormalizePoeLeagueSelection(undefined)).toBe(false);
    expect(
      canNormalizePoeLeagueSelection({
        error: "offline",
        isFetching: false,
        lastSyncedAt: null,
        provider: "test-provider",
      }),
    ).toBe(false);
    expect(
      canNormalizePoeLeagueSelection({
        error: null,
        isFetching: true,
        lastSyncedAt: "2026-07-15T00:00:00.000Z",
        provider: "test-provider",
      }),
    ).toBe(false);
    expect(
      canNormalizePoeLeagueSelection({
        error: "offline; using cached catalog",
        isFetching: false,
        lastSyncedAt: "2026-07-15T00:00:00.000Z",
        provider: "test-provider",
      }),
    ).toBe(false);
    expect(
      canNormalizePoeLeagueSelection({
        error: null,
        isFetching: false,
        lastSyncedAt: "2026-07-15T00:00:00.000Z",
        provider: "test-provider",
      }),
    ).toBe(true);
  });
});
