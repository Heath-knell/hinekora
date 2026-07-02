import { resolveActiveGameProfile } from "~/renderer/modules/profiles/Profiles.utils/Profiles.utils";
import { trackEvent } from "~/renderer/modules/umami";
import type {
  BoundStore,
  BoundStoreStateCreator,
  ProfilesSlice,
} from "~/renderer/store/store.types";

import type { GameId, Profile, ProfileUpdateInput } from "~/types";

export const createProfilesSlice: BoundStoreStateCreator<ProfilesSlice> = (
  set,
  get,
) => {
  const persistSelectedProfileId = createSelectedProfileIdPersister(set, get);
  let profilesChangeVersion = 0;
  const markProfilesChanged = () => {
    profilesChangeVersion += 1;
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
      create: async (name: string) => {
        markProfilesChanged();
        const created = await window.electron.profiles.create({ name });
        const items = await window.electron.profiles.list();
        set((state) => {
          state.profiles.items = items;
          state.profiles.selectedProfileId = created.id;
        });
        persistSelectedProfileId(created.id);
        trackEvent("profile-created", {
          game: created.game ?? "all",
        });
      },
      update: async (input: ProfileUpdateInput) => {
        markProfilesChanged();
        const updated = await window.electron.profiles.update(input);
        const items = await window.electron.profiles.list();
        set((state) => {
          state.profiles.items = items;
          state.profiles.selectedProfileId = updated.id;
        });
        persistSelectedProfileId(updated.id);
        trackEvent("profile-updated");
      },
      delete: async (id: string) => {
        markProfilesChanged();
        await window.electron.profiles.delete(id);
        const items = await window.electron.profiles.list();
        const selectedProfileId = resolveSelectedProfileId(
          items,
          get().profiles.selectedProfileId === id
            ? null
            : get().profiles.selectedProfileId,
          getActiveGame(get),
        );
        set((state) => {
          state.profiles.items = items;
          state.profiles.selectedProfileId = selectedProfileId;
          state.profiles.error = null;
        });
        persistSelectedProfileId(selectedProfileId);
        trackEvent("profile-deleted");
      },
      select: (id: string) => {
        markProfilesChanged();
        set((state) => {
          state.profiles.error = null;
          state.profiles.selectedProfileId = id;
        });
        persistSelectedProfileId(id);
        trackEvent("profile-selected");
      },
      startListening: () =>
        window.electron.profiles.onChanged((items) => {
          markProfilesChanged();
          const previousSelectedProfileId = get().profiles.selectedProfileId;
          let selectedProfileId: string | null = null;
          set((state) => {
            selectedProfileId = resolveSelectedProfileId(
              items,
              state.profiles.selectedProfileId,
              getActiveGame(get),
            );
            state.profiles.items = items;
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
