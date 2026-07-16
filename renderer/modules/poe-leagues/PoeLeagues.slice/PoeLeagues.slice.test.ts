import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PoeLeaguesChangedEvent } from "~/main/modules/poe-leagues";
import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import type { PoeLeague } from "~/types";
import { createPoeLeaguesSlice } from "./PoeLeagues.slice";

const remotePoe1Leagues: PoeLeague[] = [
  {
    endAt: null,
    id: "Next League",
    isActive: true,
    isCurrent: true,
    name: "Next League",
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
];
const remotePoe2Leagues: PoeLeague[] = [
  {
    endAt: null,
    id: "Runes of Aldur",
    isActive: true,
    isCurrent: true,
    name: "Runes of Aldur",
    startAt: null,
    updatedAt: null,
  },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function createTestStore() {
  return createBoundStoreForTests(
    (set, get, api) =>
      ({
        ...createPoeLeaguesSlice(set, get, api),
      }) as unknown as BoundStore,
  );
}

describe("PoeLeagues slice", () => {
  const list = vi.fn();
  const status = vi.fn();
  const userId = vi.fn();
  let changedListener: ((event: PoeLeaguesChangedEvent) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    changedListener = null;
    list.mockImplementation(async (game: "poe1" | "poe2") =>
      game === "poe1" ? remotePoe1Leagues : remotePoe2Leagues,
    );
    status.mockResolvedValue({
      error: null,
      isFetching: false,
      lastSyncedAt: "2026-07-11T00:00:00.000Z",
      provider: "test-provider",
    });
    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        poeLeagues: {
          list,
          onChanged: vi.fn((listener) => {
            changedListener = listener;
            return vi.fn();
          }),
          status,
          userId,
        },
      },
    });
  });

  it("hydrates both games from the main-process catalog", async () => {
    const store = createTestStore();

    await store.getState().poeLeagues.hydrate();

    expect(list).toHaveBeenCalledWith("poe1");
    expect(list).toHaveBeenCalledWith("poe2");
    expect(store.getState().poeLeagues.byGame.poe1).toEqual(remotePoe1Leagues);
    expect(store.getState().poeLeagues.errors).toEqual({});
    expect(store.getState().poeLeagues.statusByGame.poe1).toMatchObject({
      isFetching: false,
      lastSyncedAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("deduplicates concurrent hydrate requests", async () => {
    const store = createTestStore();

    await Promise.all([
      store.getState().poeLeagues.hydrate(),
      store.getState().poeLeagues.hydrate(),
    ]);

    expect(list).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledTimes(2);
  });

  it("reads status after each catalog list refresh completes", async () => {
    const didListComplete: Record<"poe1" | "poe2", boolean> = {
      poe1: false,
      poe2: false,
    };
    list.mockImplementation(async (game: "poe1" | "poe2") => {
      await Promise.resolve();
      didListComplete[game] = true;

      return game === "poe1" ? remotePoe1Leagues : remotePoe2Leagues;
    });
    status.mockImplementation(async (game: "poe1" | "poe2") => ({
      error: didListComplete[game] ? null : "stale cached catalog error",
      isFetching: false,
      lastSyncedAt: "2026-07-11T00:00:00.000Z",
      provider: "test-provider",
    }));
    const store = createTestStore();

    await store.getState().poeLeagues.hydrate();

    expect(store.getState().poeLeagues.errors).toEqual({});
  });

  it("does not overwrite a refresh event with an older hydration result", async () => {
    const poe1Status = createDeferred<Awaited<ReturnType<typeof status>>>();
    status.mockImplementation((game: "poe1" | "poe2") =>
      game === "poe1"
        ? poe1Status.promise
        : Promise.resolve({
            error: null,
            isFetching: false,
            lastSyncedAt: "2026-07-11T00:00:00.000Z",
            provider: "test-provider",
          }),
    );
    const refreshedLeagues = remotePoe1Leagues.map((league) => ({
      ...league,
      name: `${league.name} refreshed`,
    }));
    const store = createTestStore();
    store.getState().poeLeagues.startListening();

    const hydratePromise = store.getState().poeLeagues.hydrate();
    await vi.waitFor(() => expect(status).toHaveBeenCalledWith("poe1"));
    changedListener?.({
      game: "poe1",
      leagues: refreshedLeagues,
      status: {
        error: null,
        isFetching: false,
        lastSyncedAt: "2026-07-12T00:00:00.000Z",
        provider: "test-provider",
      },
    });
    poe1Status.resolve({
      error: null,
      isFetching: true,
      lastSyncedAt: "2026-07-11T00:00:00.000Z",
      provider: "test-provider",
    });
    await hydratePromise;

    expect(store.getState().poeLeagues.byGame.poe1).toEqual(refreshedLeagues);
    expect(store.getState().poeLeagues.isFetchingByGame.poe1).toBe(false);
    expect(store.getState().poeLeagues.statusByGame.poe1?.lastSyncedAt).toBe(
      "2026-07-12T00:00:00.000Z",
    );
  });

  it("keeps fallback leagues when one catalog request fails", async () => {
    list.mockImplementation(async (game: "poe1" | "poe2") =>
      game === "poe1" ? { error: "offline", ok: false } : remotePoe1Leagues,
    );
    const store = createTestStore();

    await store.getState().poeLeagues.hydrate();

    expect(store.getState().poeLeagues.byGame.poe1[0]?.id).toBe("Standard");
    expect(store.getState().poeLeagues.errors.poe1).toBe("offline");
    expect(store.getState().poeLeagues.statusByGame.poe1).toBeUndefined();
  });

  it("rejects malformed list responses without exposing runtime errors", async () => {
    list.mockImplementation(async (game: "poe1" | "poe2") =>
      game === "poe1" ? null : remotePoe1Leagues,
    );
    const store = createTestStore();

    await store.getState().poeLeagues.hydrate();

    expect(store.getState().poeLeagues.byGame.poe1[0]?.id).toBe("Standard");
    expect(store.getState().poeLeagues.errors.poe1).toBe(
      "League catalog returned an invalid response.",
    );
  });

  it("applies validated provider refresh events", () => {
    const store = createTestStore();
    store.getState().poeLeagues.startListening();

    changedListener?.({
      game: "poe1",
      leagues: remotePoe1Leagues,
      status: {
        error: null,
        isFetching: false,
        lastSyncedAt: "2026-07-11T00:00:00.000Z",
        provider: "test-provider",
      },
    });

    expect(store.getState().poeLeagues.byGame.poe1).toEqual(remotePoe1Leagues);
    expect(store.getState().poeLeagues.statusByGame.poe1).toMatchObject({
      isFetching: false,
      lastSyncedAt: "2026-07-11T00:00:00.000Z",
    });
  });

  it("ignores malformed provider refresh event envelopes", () => {
    const store = createTestStore();
    store.getState().poeLeagues.startListening();

    changedListener?.(null as never);
    changedListener?.({ game: "diablo", leagues: remotePoe1Leagues } as never);

    expect(store.getState().poeLeagues.byGame.poe1[0]?.id).toBe("Standard");
    expect(Object.keys(store.getState().poeLeagues.byGame)).toEqual([
      "poe1",
      "poe2",
    ]);
  });

  it("exposes cached-catalog warnings from main", async () => {
    status.mockResolvedValue({
      error: "Could not refresh the league catalog. Using cached data.",
      isFetching: false,
      lastSyncedAt: "2026-07-10T00:00:00.000Z",
      provider: "remote-provider",
    });
    const store = createTestStore();

    await store.getState().poeLeagues.hydrate();

    expect(store.getState().poeLeagues.errors.poe1).toBe(
      "Could not refresh the league catalog. Using cached data.",
    );
    expect(store.getState().poeLeagues.statusByGame.poe1?.lastSyncedAt).toBe(
      "2026-07-10T00:00:00.000Z",
    );
  });

  it("loads the pseudonymous session identity", async () => {
    userId.mockResolvedValue({
      previousUserIds: ["previous-session-user-id"],
      userId: "session-user-id",
    });
    const store = createTestStore();

    await store.getState().poeLeagues.loadSessionUserId();

    expect(store.getState().poeLeagues.sessionUserId).toBe("session-user-id");
    expect(store.getState().poeLeagues.previousSessionUserIds).toEqual([
      "previous-session-user-id",
    ]);
    expect(store.getState().poeLeagues.sessionUserIdError).toBeNull();
    expect(store.getState().poeLeagues.isSessionUserIdLoading).toBe(false);
  });

  it("deduplicates concurrent identity loads and refreshes a loaded identity", async () => {
    const identity = createDeferred<{
      previousUserIds: string[];
      userId: string;
    }>();
    userId.mockReturnValue(identity.promise);
    const store = createTestStore();

    const firstLoad = store.getState().poeLeagues.loadSessionUserId();
    const secondLoad = store.getState().poeLeagues.loadSessionUserId();
    expect(secondLoad).toBe(firstLoad);
    expect(userId).toHaveBeenCalledOnce();

    identity.resolve({ previousUserIds: [], userId: "session-user-id" });
    await firstLoad;
    userId.mockResolvedValue({
      previousUserIds: ["session-user-id"],
      userId: "rotated-session-user-id",
    });
    await store.getState().poeLeagues.loadSessionUserId();

    expect(userId).toHaveBeenCalledTimes(2);
    expect(store.getState().poeLeagues.sessionUserId).toBe(
      "rotated-session-user-id",
    );
    expect(store.getState().poeLeagues.previousSessionUserIds).toEqual([
      "session-user-id",
    ]);
  });

  it("rejects invalid and failed session identity responses", async () => {
    const store = createTestStore();
    userId.mockResolvedValueOnce(null).mockResolvedValueOnce({
      error: "Identity unavailable",
      ok: false,
    });

    await store.getState().poeLeagues.loadSessionUserId();
    expect(store.getState().poeLeagues.sessionUserIdError).toBe(
      "Session identity returned an invalid response.",
    );

    await store.getState().poeLeagues.loadSessionUserId();
    expect(store.getState().poeLeagues.sessionUserIdError).toBe(
      "Identity unavailable",
    );
  });

  it("tracks background catalog fetching from change events", () => {
    const store = createTestStore();
    store.getState().poeLeagues.startListening();

    changedListener?.({
      game: "poe2",
      leagues: remotePoe2Leagues,
      status: {
        error: null,
        isFetching: true,
        lastSyncedAt: "2026-07-11T00:00:00.000Z",
        provider: "test-provider",
      },
    });

    expect(store.getState().poeLeagues.isFetchingByGame.poe2).toBe(true);
    expect(store.getState().poeLeagues.statusByGame.poe2?.isFetching).toBe(
      true,
    );
  });
});
