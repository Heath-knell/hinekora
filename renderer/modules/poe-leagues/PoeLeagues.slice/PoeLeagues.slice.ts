import type {
  BoundStoreStateCreator,
  PoeLeaguesSlice,
} from "~/renderer/store/store.types";

import {
  createActivePoeLeagueCatalog,
  gameIds,
  type PoeLeague,
  PoeLeaguesChangedEventSchema,
  type PoeLeaguesListResult,
  PoeLeaguesListResultSchema,
  type PoeLeaguesStatusResult,
  PoeLeaguesStatusResultSchema,
  type PoeLeaguesSyncStatus,
  PoeLeaguesUserIdResultSchema,
} from "~/types";

const createPoeLeaguesSlice: BoundStoreStateCreator<PoeLeaguesSlice> = (
  set,
) => {
  const catalogChangeVersions: Record<(typeof gameIds)[number], number> = {
    poe1: 0,
    poe2: 0,
  };
  let hydratePromise: Promise<void> | null = null;
  let sessionUserIdPromise: Promise<void> | null = null;

  const runHydrate = async () => {
    await Promise.all(
      gameIds.map(async (game) => {
        const changeVersion = catalogChangeVersions[game];

        try {
          const result = await window.electron.poeLeagues.list(game);
          const parsed = PoeLeaguesListResultSchema.safeParse(result);
          if (!parsed.success) {
            throw new Error("League catalog returned an invalid response.");
          }
          const parsedResult = parsed.data;
          if (!isPoeLeagueArray(parsedResult)) {
            throw new Error(parsedResult.error);
          }

          if (changeVersion !== catalogChangeVersions[game]) {
            return;
          }

          set((state) => {
            state.poeLeagues.byGame[game] = parsedResult;
          });

          const statusResult = await window.electron.poeLeagues.status(game);
          const parsedStatus =
            PoeLeaguesStatusResultSchema.safeParse(statusResult);
          if (!parsedStatus.success) {
            throw new Error("League catalog returned an invalid status.");
          }
          const status = parsedStatus.data;
          if (!isPoeLeaguesSyncStatus(status)) {
            throw new Error(status.error);
          }

          if (changeVersion !== catalogChangeVersions[game]) {
            return;
          }

          set((state) => {
            state.poeLeagues.isFetchingByGame[game] = status.isFetching;
            state.poeLeagues.statusByGame[game] = status;
            if (status.error) {
              state.poeLeagues.errors[game] = status.error;
            } else {
              delete state.poeLeagues.errors[game];
            }
          });
        } catch (error) {
          if (changeVersion !== catalogChangeVersions[game]) {
            return;
          }

          set((state) => {
            state.poeLeagues.errors[game] =
              error instanceof Error
                ? error.message
                : "Could not load league catalog.";
          });
        }
      }),
    );
  };

  return {
    poeLeagues: {
      byGame: createActivePoeLeagueCatalog(),
      errors: {},
      isFetchingByGame: { poe1: false, poe2: false },
      statusByGame: {},
      previousSessionUserIds: [],
      sessionUserId: null,
      sessionUserIdError: null,
      isSessionUserIdLoading: false,
      hydrate: () => {
        if (hydratePromise) {
          return hydratePromise;
        }

        hydratePromise = runHydrate().finally(() => {
          hydratePromise = null;
        });

        return hydratePromise;
      },
      loadSessionUserId: () => {
        if (sessionUserIdPromise) {
          return sessionUserIdPromise;
        }

        sessionUserIdPromise = loadSessionUserId().finally(() => {
          sessionUserIdPromise = null;
        });

        return sessionUserIdPromise;
      },
      startListening: () =>
        window.electron.poeLeagues.onChanged((event) => {
          const parsed = PoeLeaguesChangedEventSchema.safeParse(event);
          if (!parsed.success) {
            return;
          }

          catalogChangeVersions[parsed.data.game] += 1;
          set((state) => {
            state.poeLeagues.byGame[parsed.data.game] = parsed.data.leagues;
            state.poeLeagues.isFetchingByGame[parsed.data.game] =
              parsed.data.status.isFetching;
            state.poeLeagues.statusByGame[parsed.data.game] =
              parsed.data.status;
            if (parsed.data.status.error) {
              state.poeLeagues.errors[parsed.data.game] =
                parsed.data.status.error;
            } else {
              delete state.poeLeagues.errors[parsed.data.game];
            }
          });
        }),
    },
  };

  async function loadSessionUserId(): Promise<void> {
    set((state) => {
      state.poeLeagues.isSessionUserIdLoading = true;
      state.poeLeagues.sessionUserIdError = null;
    });

    try {
      const result = await window.electron.poeLeagues.userId();
      const parsed = PoeLeaguesUserIdResultSchema.safeParse(result);
      if (!parsed.success) {
        throw new Error("Session identity returned an invalid response.");
      }
      if (!("userId" in parsed.data)) {
        throw new Error(parsed.data.error);
      }
      const userId = parsed.data.userId;
      const previousUserIds = parsed.data.previousUserIds;

      set((state) => {
        state.poeLeagues.previousSessionUserIds = previousUserIds;
        state.poeLeagues.sessionUserId = userId;
      });
    } catch (error) {
      set((state) => {
        state.poeLeagues.sessionUserIdError =
          error instanceof Error
            ? error.message
            : "Could not load the session identity.";
      });
    } finally {
      set((state) => {
        state.poeLeagues.isSessionUserIdLoading = false;
      });
    }
  }
};

export { createPoeLeaguesSlice };

function isPoeLeagueArray(value: PoeLeaguesListResult): value is PoeLeague[] {
  return Array.isArray(value);
}

function isPoeLeaguesSyncStatus(
  value: PoeLeaguesStatusResult,
): value is PoeLeaguesSyncStatus {
  return !("ok" in value);
}
