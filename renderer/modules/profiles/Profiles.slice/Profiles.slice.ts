import { resolveActiveGameProfile } from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import type {
  BoundStore,
  BoundStoreStateCreator,
  ProfilesSlice,
} from "~/renderer/store/store.types";

import type { GameId, Profile, ProfileUpdateInput } from "~/types";

interface ProfileUpdateCompletion {
  isSettled: boolean;
  promise: Promise<void>;
  reject: (reason: unknown) => void;
  resolve: () => void;
}

interface PendingProfileUpdate {
  firstQueuedAt: number;
  input: ProfileUpdateInput;
}

interface ProfileUpdateQueue {
  completion: ProfileUpdateCompletion;
  isCancelled: boolean;
  isRunning: boolean;
  pending: PendingProfileUpdate | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const PROFILE_UPDATE_DEBOUNCE_MS = 120;
const PROFILE_UPDATE_MAX_LATENCY_MS = 400;

export const createProfilesSlice: BoundStoreStateCreator<ProfilesSlice> = (
  set,
  get,
) => {
  const persistSelectedProfileId = createSelectedProfileIdPersister(set, get);
  let profilesChangeVersion = 0;
  const deletingProfileIds = new Set<string>();
  const updateQueues = new Map<string, ProfileUpdateQueue>();
  const markProfilesChanged = () => {
    profilesChangeVersion += 1;
  };
  const applyOptimisticUpdate = (input: ProfileUpdateInput) => {
    set((state) => {
      const profile = state.profiles.items.find((item) => item.id === input.id);
      if (!profile) {
        return;
      }

      Object.assign(profile, input, { id: profile.id });
      state.profiles.error = null;
    });
  };
  const mergeIntoPendingUpdate = (
    queue: ProfileUpdateQueue,
    input: ProfileUpdateInput,
  ) => {
    if (queue.pending) {
      queue.pending.input = { ...queue.pending.input, ...input, id: input.id };
      return;
    }

    queue.pending = { firstQueuedAt: Date.now(), input };
  };
  const mergeFailedBatchIntoPending = (
    queue: ProfileUpdateQueue,
    batch: PendingProfileUpdate,
  ) => {
    if (!queue.pending) {
      queue.pending = {
        firstQueuedAt: Date.now() - PROFILE_UPDATE_MAX_LATENCY_MS,
        input: batch.input,
      };
      return;
    }
    queue.pending.input = {
      ...batch.input,
      ...queue.pending.input,
      id: batch.input.id,
    };
    queue.pending.firstQueuedAt = Date.now() - PROFILE_UPDATE_MAX_LATENCY_MS;
  };
  const finishUpdateQueue = (
    profileId: string,
    queue: ProfileUpdateQueue,
    failure?: { error: unknown },
  ) => {
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = null;
    }
    queue.isRunning = false;
    queue.pending = null;
    if (updateQueues.get(profileId) === queue) {
      updateQueues.delete(profileId);
    }
    if (queue.completion.isSettled) {
      return;
    }

    queue.completion.isSettled = true;
    if (!failure) {
      queue.completion.resolve();
    } else {
      queue.completion.reject(failure.error);
    }
  };
  const scheduleUpdateQueue = (
    profileId: string,
    queue: ProfileUpdateQueue,
  ) => {
    if (queue.isCancelled || queue.isRunning || !queue.pending) {
      return;
    }
    if (queue.timer) {
      clearTimeout(queue.timer);
    }

    const elapsed = Date.now() - queue.pending.firstQueuedAt;
    const delay = Math.max(
      0,
      Math.min(
        PROFILE_UPDATE_DEBOUNCE_MS,
        PROFILE_UPDATE_MAX_LATENCY_MS - elapsed,
      ),
    );
    queue.timer = setTimeout(() => {
      void flushUpdateQueue(profileId, queue);
    }, delay);
  };
  const flushUpdateQueue = async (
    profileId: string,
    queue: ProfileUpdateQueue,
  ): Promise<void> => {
    queue.timer = null;
    if (queue.isCancelled || !queue.pending) {
      finishUpdateQueue(profileId, queue);
      return;
    }

    const batch = queue.pending;
    queue.pending = null;
    queue.isRunning = true;
    let finalError: unknown;
    let didFail = false;

    try {
      const updated = await window.electron.profiles.update(batch.input);
      if (!queue.isCancelled && queue.pending === null) {
        let selectedProfileId: string | null = null;
        set((state) => {
          const items = replaceProfile(state.profiles.items, updated);
          selectedProfileId = resolveSelectedProfileId(
            items,
            updated.id,
            getActiveGame(get),
          );
          state.profiles.items = items;
          state.profiles.selectedProfileId = selectedProfileId;
          state.profiles.error = null;
        });
        persistSelectedProfileId(selectedProfileId);
      }
    } catch (error) {
      if (!queue.isCancelled && queue.pending) {
        mergeFailedBatchIntoPending(queue, batch);
      } else if (!queue.isCancelled) {
        let recoveredItems: Profile[] | null = null;
        try {
          recoveredItems = await window.electron.profiles.list();
        } catch {
          // Keep the optimistic state when authoritative recovery also fails.
        }

        if (queue.pending) {
          mergeFailedBatchIntoPending(queue, batch);
        } else if (!queue.isCancelled) {
          set((state) => {
            if (recoveredItems) {
              state.profiles.items = reconcileAuthoritativeProfiles(
                state.profiles.items,
                recoveredItems,
                updateQueues.keys(),
                new Set([profileId]),
              );
            }
            state.profiles.error =
              error instanceof Error ? error.message : "Profile update failed";
          });
          finalError = error;
          didFail = true;
        }
      }
    }

    queue.isRunning = false;
    if (queue.isCancelled) {
      finishUpdateQueue(profileId, queue);
    } else if (queue.pending) {
      scheduleUpdateQueue(profileId, queue);
    } else if (didFail) {
      finishUpdateQueue(profileId, queue, { error: finalError });
    } else {
      finishUpdateQueue(profileId, queue);
    }
  };
  const enqueueUpdate = (input: ProfileUpdateInput): Promise<void> => {
    markProfilesChanged();
    const existingQueue = updateQueues.get(input.id);
    const queue = existingQueue ?? createProfileUpdateQueue();
    updateQueues.set(input.id, queue);

    mergeIntoPendingUpdate(queue, input);
    scheduleUpdateQueue(input.id, queue);

    return queue.completion.promise;
  };
  const cancelProfileUpdates = async (profileId: string): Promise<void> => {
    const queue = updateQueues.get(profileId);
    if (!queue) {
      return;
    }

    queue.isCancelled = true;
    queue.pending = null;
    if (!queue.isRunning) {
      finishUpdateQueue(profileId, queue);
    }
    await queue.completion.promise;
  };
  const flushProfileUpdates = async (profileId: string): Promise<void> => {
    const queue = updateQueues.get(profileId);
    if (!queue) {
      return;
    }

    if (!queue.isRunning && queue.pending) {
      if (queue.timer) {
        clearTimeout(queue.timer);
        queue.timer = null;
      }
      void flushUpdateQueue(profileId, queue);
    }

    await queue.completion.promise;
  };
  const recoverProfilesAfterMutationFailure = async (
    error: unknown,
    fallbackMessage: string,
  ): Promise<void> => {
    let recoveredItems: Profile[] | null = null;
    try {
      recoveredItems = await window.electron.profiles.list();
    } catch {
      // Preserve local state when authoritative recovery also fails.
    }

    set((state) => {
      if (recoveredItems) {
        state.profiles.items = recoveredItems;
        state.profiles.selectedProfileId = resolveSelectedProfileId(
          recoveredItems,
          state.profiles.selectedProfileId,
          getActiveGame(get),
        );
      }
      state.profiles.error =
        error instanceof Error ? error.message : fallbackMessage;
    });
  };

  return {
    profiles: {
      items: [],
      isLoading: false,
      error: null,
      selectedProfileId: null,
      hydrate: async () => {
        const changeVersion = profilesChangeVersion;
        set((state) => {
          state.profiles.isLoading = true;
          state.profiles.error = null;
        });
        try {
          const items = await window.electron.profiles.list();
          if (changeVersion !== profilesChangeVersion) {
            set((state) => {
              state.profiles.isLoading = false;
            });
            return;
          }

          const persistedProfileId = getPersistedSelectedProfileId(get);
          let selectedProfileId: string | null = null;
          set((state) => {
            const preferredProfileId =
              persistedProfileId ?? state.profiles.selectedProfileId;
            selectedProfileId = resolveSelectedProfileId(
              items,
              preferredProfileId,
              getActiveGame(get),
            );
            state.profiles.items = items;
            state.profiles.isLoading = false;
            state.profiles.selectedProfileId = selectedProfileId;
          });
          if (
            persistedProfileId !== null &&
            persistedProfileId !== selectedProfileId
          ) {
            persistSelectedProfileId(selectedProfileId);
          }
        } catch (error) {
          set((state) => {
            state.profiles.isLoading = false;
            state.profiles.error =
              error instanceof Error ? error.message : "Load failed";
          });
        }
      },
      create: async (name: string, game = null) => {
        markProfilesChanged();
        const created = await window.electron.profiles.create({ game, name });
        let selectedProfileId: string | null = null;
        set((state) => {
          const items = replaceProfile(state.profiles.items, created);
          selectedProfileId = resolveSelectedProfileId(
            items,
            created.id,
            getActiveGame(get),
          );
          state.profiles.items = items;
          state.profiles.selectedProfileId = selectedProfileId;
          state.profiles.error = null;
        });
        persistSelectedProfileId(selectedProfileId);
      },
      duplicate: async (sourceId: string, name: string) => {
        markProfilesChanged();
        try {
          await flushProfileUpdates(sourceId);
          const duplicated = await window.electron.profiles.duplicate({
            name,
            sourceId,
          });
          set((state) => {
            state.profiles.items = replaceProfile(
              state.profiles.items,
              duplicated,
            );
            state.profiles.selectedProfileId = duplicated.id;
            state.profiles.error = null;
          });
          persistSelectedProfileId(duplicated.id);
        } catch (error) {
          await recoverProfilesAfterMutationFailure(
            error,
            "Unable to duplicate profile",
          );
          throw error;
        }
      },
      update: async (input: ProfileUpdateInput) => {
        if (deletingProfileIds.has(input.id)) {
          return;
        }
        applyOptimisticUpdate(input);
        await enqueueUpdate(input);
      },
      updateFromCurrent: async (id, createInput) => {
        if (deletingProfileIds.has(id)) {
          return;
        }
        const profile = get().profiles.items.find((item) => item.id === id);
        if (!profile) {
          return;
        }

        const update = createInput(profile);
        if (!update) {
          return;
        }

        const input = { ...update, id };
        applyOptimisticUpdate(input);
        await enqueueUpdate(input);
      },
      delete: async (id: string) => {
        const profile = get().profiles.items.find((item) => item.id === id);
        if (!profile) {
          return;
        }

        markProfilesChanged();
        deletingProfileIds.add(id);
        try {
          await cancelProfileUpdates(id);
          const items = await window.electron.profiles.delete(id);
          const selectedProfileId = resolveSelectedProfileId(
            items,
            get().profiles.selectedProfileId,
            getActiveGame(get),
          );
          set((state) => {
            state.profiles.items = items;
            state.profiles.selectedProfileId = selectedProfileId;
            state.profiles.error = null;
          });
          persistSelectedProfileId(selectedProfileId);
        } catch (error) {
          await recoverProfilesAfterMutationFailure(
            error,
            "Unable to delete profile",
          );
          throw error;
        } finally {
          deletingProfileIds.delete(id);
        }
      },
      deleteAll: async (fallbackId: string) => {
        const items = get().profiles.items;
        if (items.length === 0) {
          return;
        }

        markProfilesChanged();
        for (const item of items) {
          deletingProfileIds.add(item.id);
        }
        try {
          await Promise.all(items.map((item) => cancelProfileUpdates(item.id)));
          const remainingItems =
            await window.electron.profiles.deleteAll(fallbackId);
          const selectedProfileId = resolveSelectedProfileId(
            remainingItems,
            fallbackId,
            getActiveGame(get),
          );
          set((state) => {
            state.profiles.items = remainingItems;
            state.profiles.selectedProfileId = selectedProfileId;
            state.profiles.error = null;
          });
          persistSelectedProfileId(selectedProfileId);
        } catch (error) {
          await recoverProfilesAfterMutationFailure(
            error,
            "Unable to delete all profiles",
          );
          throw error;
        } finally {
          for (const item of items) {
            deletingProfileIds.delete(item.id);
          }
        }
      },
      flush: flushProfileUpdates,
      select: (id: string) => {
        markProfilesChanged();
        set((state) => {
          state.profiles.error = null;
          state.profiles.selectedProfileId = id;
        });
        persistSelectedProfileId(id);
      },
      startListening: () =>
        window.electron.profiles.onChanged((items) => {
          markProfilesChanged();
          const previousSelectedProfileId = get().profiles.selectedProfileId;
          let selectedProfileId: string | null = null;
          set((state) => {
            const nextItems = reconcileAuthoritativeProfiles(
              state.profiles.items,
              items,
              updateQueues.keys(),
            );
            selectedProfileId = resolveSelectedProfileId(
              nextItems,
              state.profiles.selectedProfileId,
              getActiveGame(get),
            );
            state.profiles.items = nextItems;
            state.profiles.selectedProfileId = selectedProfileId;
          });
          if (
            previousSelectedProfileId !== null &&
            previousSelectedProfileId !== selectedProfileId
          ) {
            persistSelectedProfileId(selectedProfileId);
          }
        }),
    },
  };
};

function createProfileUpdateQueue(): ProfileUpdateQueue {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    completion: { isSettled: false, promise, reject, resolve },
    isCancelled: false,
    isRunning: false,
    pending: null,
    timer: null,
  };
}

function replaceProfile(
  items: readonly Profile[],
  updated: Profile,
): Profile[] {
  const existingIndex = items.findIndex((item) => item.id === updated.id);
  if (existingIndex === -1) {
    return [...items, updated];
  }

  return items.map((item) => (item.id === updated.id ? updated : item));
}

function reconcileAuthoritativeProfiles(
  currentItems: readonly Profile[],
  authoritativeItems: readonly Profile[],
  queuedProfileIds: Iterable<string>,
  authoritativeQueuedProfileIds: ReadonlySet<string> = new Set(),
): Profile[] {
  const queuedIds = new Set(queuedProfileIds);
  const currentItemsById = new Map(
    currentItems.map((item) => [item.id, item] as const),
  );
  const authoritativeIds = new Set(authoritativeItems.map((item) => item.id));
  const reconciledItems = authoritativeItems.map((item) => {
    if (queuedIds.has(item.id) && !authoritativeQueuedProfileIds.has(item.id)) {
      return currentItemsById.get(item.id) ?? item;
    }

    return item;
  });

  for (const item of currentItems) {
    if (
      queuedIds.has(item.id) &&
      !authoritativeQueuedProfileIds.has(item.id) &&
      !authoritativeIds.has(item.id)
    ) {
      reconciledItems.push(item);
    }
  }

  return reconciledItems;
}

function resolveSelectedProfileId(
  items: Profile[],
  preferredProfileId: string | null,
  activeGame: GameId,
): string | null {
  return (
    resolveActiveGameProfile(items, preferredProfileId, activeGame)?.id ?? null
  );
}

function getSettings(get: () => BoundStore): BoundStore["settings"] | null {
  return get().settings ?? null;
}

function getPersistedSelectedProfileId(get: () => BoundStore): string | null {
  return getSettings(get)?.value?.selectedProfileId ?? null;
}

function getActiveGame(get: () => BoundStore): GameId {
  return getSettings(get)?.value?.activeGame ?? "poe1";
}

function createSelectedProfileIdPersister(
  set: Parameters<BoundStoreStateCreator<ProfilesSlice>>[0],
  get: () => BoundStore,
): (selectedProfileId: string | null) => void {
  let pendingSelectedProfileId: string | null | undefined;
  let requestVersion = 0;

  return (selectedProfileId) => {
    const settings = getSettings(get);
    const selectProfile = window.electron.profiles.select;
    const updateSettings = window.electron.settings?.update;
    const persistSelection =
      selectedProfileId !== null && typeof selectProfile === "function"
        ? () => selectProfile(selectedProfileId)
        : typeof updateSettings === "function"
          ? () => updateSettings({ selectedProfileId })
          : null;
    if (!persistSelection) {
      return;
    }

    const previousSelectedProfileId =
      settings?.value?.selectedProfileId ?? null;
    if (
      previousSelectedProfileId === selectedProfileId &&
      pendingSelectedProfileId === undefined
    ) {
      return;
    }

    pendingSelectedProfileId = selectedProfileId;
    requestVersion += 1;
    const currentRequestVersion = requestVersion;
    void persistSelection()
      .then(() => {
        if (requestVersion === currentRequestVersion) {
          pendingSelectedProfileId = undefined;
        }
      })
      .catch((error) => {
        if (requestVersion === currentRequestVersion) {
          pendingSelectedProfileId = undefined;
        }
        set((state) => {
          if (state.profiles.selectedProfileId !== selectedProfileId) {
            return;
          }

          state.profiles.selectedProfileId = resolveSelectedProfileId(
            state.profiles.items,
            previousSelectedProfileId,
            getActiveGame(get),
          );
          state.profiles.error =
            error instanceof Error
              ? error.message
              : "Unable to persist selected profile";
        });
      });
  };
}
