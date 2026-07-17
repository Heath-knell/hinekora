import {
  createCaptureTargetFromPreviewSource,
  isCapturePreviewSourceAvailable,
  resolveCapturePreviewSourceId,
} from "~/renderer/modules/capture-preview/CapturePreview.utils/CapturePreview.utils";
import {
  createSettingsUpdateFromCaptureProfile,
  pickCaptureProfileSettingsUpdate,
  resolveActiveGameCaptureProfile,
  resolveCaptureProfileForGame,
  resolveSelectedCaptureProfile,
} from "~/renderer/modules/capture-profiles/CaptureProfiles.utils/CaptureProfiles.utils";
import {
  getLeagueSettingKey,
  leagueOptions,
  normalizeLeagueForGame,
} from "~/renderer/modules/game/GameScope.constants";
import { isManagedRecorderStatusActive } from "~/renderer/modules/managed-recorder/ManagedRecorder.utils/ManagedRecorder.utils";
import type {
  BoundStore,
  BoundStoreStateCreator,
  CaptureProfilesSlice,
} from "~/renderer/store/store.types";

import type {
  AppSettings,
  CaptureProfile,
  CaptureProfileSettingsUpdate,
  CaptureProfileUpdateInput,
  CaptureTarget,
  GameId,
} from "~/types";
import { canNormalizePoeLeagueSelection, gameIds } from "~/types";

const captureProfileMemoryGames = gameIds;

export const createCaptureProfilesSlice: BoundStoreStateCreator<
  CaptureProfilesSlice
> = (set, get) => {
  const applySelectedProfileSettings = createSelectedProfileSettingsApplier(
    set,
    get,
    () => selectedProfileIdsByGame,
  );
  const selectedProfileIdsByGame: Partial<Record<GameId, string>> = {};

  const rememberProfileSelection = (profile: CaptureProfile) => {
    selectedProfileIdsByGame[profile.game] = profile.id;
  };

  const pruneRememberedProfiles = (items: CaptureProfile[]) => {
    for (const game of Object.keys(selectedProfileIdsByGame) as GameId[]) {
      const selectedProfileId = selectedProfileIdsByGame[game];
      if (
        selectedProfileId &&
        !items.some(
          (item) => item.id === selectedProfileId && item.game === game,
        )
      ) {
        delete selectedProfileIdsByGame[game];
      }
    }
  };

  const seedRememberedProfiles = (
    settings: Partial<AppSettings> | null | undefined,
    items: CaptureProfile[],
  ) => {
    const persistedSelections = settings?.selectedCaptureProfileIdsByGame ?? {};
    for (const game of Object.keys(persistedSelections) as GameId[]) {
      const selectedProfileId = persistedSelections[game];
      if (
        selectedProfileId &&
        items.some(
          (item) => item.id === selectedProfileId && item.game === game,
        )
      ) {
        selectedProfileIdsByGame[game] = selectedProfileId;
      }
    }
  };

  return {
    captureProfiles: {
      items: [],
      isLoading: false,
      error: null,
      selectedProfileId: null,
      isProfileUnlocked: false,
      hydrate: async () => {
        set((state) => {
          state.captureProfiles.isLoading = true;
          state.captureProfiles.error = null;
        });
        try {
          const items = await window.electron.captureProfiles.list();
          const settingsValue = get().settings.value;
          const activeGame = settingsValue?.activeGame ?? "poe1";
          seedRememberedProfiles(settingsValue, items);
          const selectedProfile =
            resolveSelectedCaptureProfile(
              items,
              settingsValue?.selectedCaptureProfileId ?? null,
            ) ??
            resolveCaptureProfileForGame(
              items,
              selectedProfileIdsByGame[activeGame] ?? null,
              activeGame,
            ) ??
            resolveActiveGameCaptureProfile(items, null, activeGame);
          set((state) => {
            state.captureProfiles.items = items;
            state.captureProfiles.isLoading = false;
            state.captureProfiles.selectedProfileId =
              selectedProfile?.id ?? null;
          });
          if (selectedProfile) {
            rememberProfileSelection(selectedProfile);
            void applySelectedProfileSettings(selectedProfile);
          }
        } catch (error) {
          set((state) => {
            state.captureProfiles.isLoading = false;
            state.captureProfiles.error =
              error instanceof Error ? error.message : "Load failed";
          });
        }
      },
      create: async (
        name: string,
        settings: CaptureProfileSettingsUpdate = {},
      ) => {
        if (isCaptureProfileMutationBlocked(get)) {
          set((state) => {
            state.captureProfiles.error =
              "Stop recording or rewind before creating a capture profile.";
          });
          return { status: "blocked" };
        }

        const activeGame = get().settings.value?.activeGame ?? "poe1";
        const captureTarget = resolveCaptureTargetForNewProfile(
          get,
          activeGame,
        );
        set((state) => {
          state.captureProfiles.error = null;
        });
        let created: CaptureProfile;
        try {
          created = await window.electron.captureProfiles.create({
            ...(captureTarget ? { captureTarget } : {}),
            name,
            game: activeGame,
            ...settings,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to create profile";
          set((state) => {
            state.captureProfiles.error = message;
          });
          return { message, status: "failed" };
        }
        const reportCreatedNotApplied = (message: string) => {
          set((state) => {
            state.captureProfiles.error = message;
          });

          return {
            message,
            profile: created,
            status: "created-not-applied" as const,
          };
        };
        if (isCaptureProfileMutationBlocked(get)) {
          return reportCreatedNotApplied(
            "The profile was saved, but recording started before it could be selected.",
          );
        }
        let items: CaptureProfile[];
        try {
          items = await window.electron.captureProfiles.list();
        } catch (error) {
          return reportCreatedNotApplied(
            error instanceof Error
              ? `The profile was saved, but profiles could not refresh: ${error.message}`
              : "The profile was saved, but profiles could not refresh.",
          );
        }
        if (isCaptureProfileMutationBlocked(get)) {
          return reportCreatedNotApplied(
            "The profile was saved, but recording started before it could be selected.",
          );
        }
        const previousSelectedProfileId =
          get().captureProfiles.selectedProfileId;
        set((state) => {
          state.captureProfiles.items = items;
          state.captureProfiles.selectedProfileId = created.id;
          state.captureProfiles.error = null;
        });
        const wasApplied = await applySelectedProfileSettings(created);
        if (!wasApplied) {
          set((state) => {
            state.captureProfiles.selectedProfileId = previousSelectedProfileId;
          });
          return reportCreatedNotApplied(
            get().captureProfiles.error ??
              "The profile was saved, but its settings could not be selected.",
          );
        }

        rememberProfileSelection(created);
        return { profile: created, status: "applied" };
      },
      update: async (input: CaptureProfileUpdateInput) => {
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }

        const updated = await window.electron.captureProfiles.update(input);
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }
        const items = await window.electron.captureProfiles.list();
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }
        const wasSelected =
          get().captureProfiles.selectedProfileId === updated.id;
        set((state) => {
          state.captureProfiles.items = items;
          state.captureProfiles.error = null;
          if (wasSelected) {
            state.captureProfiles.selectedProfileId = updated.id;
          }
        });
        if (wasSelected) {
          rememberProfileSelection(updated);
          void applySelectedProfileSettings(updated);
        }
      },
      delete: async (id: string) => {
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }

        await window.electron.captureProfiles.delete(id);
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }
        const items = await window.electron.captureProfiles.list();
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }
        pruneRememberedProfiles(items);
        const settingsValue = get().settings.value;
        const selectedProfile = resolveActiveGameCaptureProfile(
          items,
          get().captureProfiles.selectedProfileId === id
            ? null
            : get().captureProfiles.selectedProfileId,
          settingsValue?.activeGame ?? "poe1",
        );
        set((state) => {
          state.captureProfiles.items = items;
          state.captureProfiles.selectedProfileId = selectedProfile?.id ?? null;
          state.captureProfiles.error = null;
        });
        if (selectedProfile) {
          rememberProfileSelection(selectedProfile);
          void applySelectedProfileSettings(selectedProfile);
        }
      },
      select: (id: string) => {
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }

        const profile =
          get().captureProfiles.items.find((item) => item.id === id) ?? null;
        if (!profile) {
          set((state) => {
            state.captureProfiles.error = "Capture profile not found";
          });
          return;
        }

        set((state) => {
          state.captureProfiles.error = null;
          state.captureProfiles.selectedProfileId = id;
        });
        rememberProfileSelection(profile);
        void applySelectedProfileSettings(profile);
      },
      selectWithPreviewSource: (id: string) => {
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }

        const profile =
          get().captureProfiles.items.find((item) => item.id === id) ?? null;
        if (!profile) {
          set((state) => {
            state.captureProfiles.error = "Capture profile not found";
          });
          return;
        }

        set((state) => {
          state.captureProfiles.error = null;
          state.captureProfiles.selectedProfileId = id;
        });
        selectCapturePreviewSourceForGame(
          set,
          get,
          profile.captureTarget,
          profile.game,
        );
        rememberProfileSelection(profile);
        void applySelectedProfileSettings(profile);
      },
      selectForGame: async (game: GameId) => {
        if (isCaptureProfileMutationBlocked(get)) {
          return;
        }

        const items = get().captureProfiles.items;
        const selectedProfile = resolveCaptureProfileForGame(
          items,
          selectedProfileIdsByGame[game] ??
            get().settings.value?.selectedCaptureProfileIdsByGame?.[game] ??
            get().captureProfiles.selectedProfileId,
          game,
        );
        set((state) => {
          state.captureProfiles.error = null;
          state.captureProfiles.selectedProfileId = selectedProfile?.id ?? null;
        });
        selectCapturePreviewSourceForGame(
          set,
          get,
          selectedProfile?.captureTarget ?? null,
          game,
        );

        if (selectedProfile) {
          rememberProfileSelection(selectedProfile);
          if (isCaptureProfileMutationBlocked(get)) {
            return;
          }
          await applySelectedProfileSettings(selectedProfile);
        } else {
          if (isCaptureProfileMutationBlocked(get)) {
            return;
          }
          await applyGameSettings(set, get, game);
        }
      },
      setProfileUnlocked: (isUnlocked: boolean) => {
        if (isUnlocked && isCaptureProfileMutationBlocked(get)) {
          return;
        }

        set((state) => {
          state.captureProfiles.isProfileUnlocked = isUnlocked;
          state.captureProfiles.error = null;
        });
        if (isUnlocked) {
          void persistCurrentSettingsToSelectedCaptureProfile(set, get);
        }
      },
      toggleProfileLock: () => {
        get().captureProfiles.setProfileUnlocked(
          !get().captureProfiles.isProfileUnlocked,
        );
      },
      startListening: () =>
        window.electron.captureProfiles.onChanged((items) => {
          pruneRememberedProfiles(items);
          if (isCaptureProfileMutationBlocked(get)) {
            set((state) => {
              state.captureProfiles.items = items;
            });
            return;
          }

          const settingsValue = get().settings.value;
          const currentSelectedProfile = resolveSelectedCaptureProfile(
            items,
            get().captureProfiles.selectedProfileId,
          );
          const selectedProfile =
            currentSelectedProfile ??
            resolveActiveGameCaptureProfile(
              items,
              get().captureProfiles.selectedProfileId,
              settingsValue?.activeGame ?? "poe1",
            );
          set((state) => {
            state.captureProfiles.items = items;
            state.captureProfiles.selectedProfileId =
              selectedProfile?.id ?? null;
          });
          if (selectedProfile) {
            rememberProfileSelection(selectedProfile);
            void applySelectedProfileSettings(selectedProfile);
          }
        }),
    },
  };
};

function isCaptureProfileMutationBlocked(get: () => BoundStore): boolean {
  return isManagedRecorderStatusActive(get().managedRecorder?.status);
}

async function persistCurrentSettingsToSelectedCaptureProfile(
  set: Parameters<BoundStoreStateCreator<CaptureProfilesSlice>>[0],
  get: () => BoundStore,
): Promise<void> {
  const selectedProfileId = get().captureProfiles.selectedProfileId;
  const settings = get().settings.value;
  const selectedProfile =
    get().captureProfiles.items.find(
      (profile) => profile.id === selectedProfileId,
    ) ?? null;
  if (!selectedProfileId || !settings) {
    return;
  }

  const captureProfileUpdate = pickCaptureProfileSettingsUpdate(settings);
  if (!captureProfileUpdate || !selectedProfile) {
    return;
  }
  const selectedSource =
    get().capturePreview.sources.find(
      (source) => source.id === get().capturePreview.selectedSourceId,
    ) ?? null;
  const captureTarget =
    selectedSource &&
    (!selectedSource.game || selectedSource.game === selectedProfile.game)
      ? createCaptureTargetFromPreviewSource(selectedSource)
      : undefined;

  try {
    const updatedProfile = await window.electron.captureProfiles.update({
      id: selectedProfileId,
      ...captureProfileUpdate,
      ...(captureTarget ? { captureTarget } : {}),
    });
    if (
      isCaptureProfileMutationBlocked(get) ||
      get().captureProfiles.selectedProfileId !== selectedProfileId ||
      get().captureProfiles.isProfileUnlocked !== true
    ) {
      return;
    }

    set((state) => {
      const index = state.captureProfiles.items.findIndex(
        (profile) => profile.id === updatedProfile.id,
      );
      if (index >= 0) {
        state.captureProfiles.items[index] = updatedProfile;
      }
      state.captureProfiles.selectedProfileId = updatedProfile.id;
      state.captureProfiles.error = null;
    });
  } catch (error) {
    if (isCaptureProfileMutationBlocked(get)) {
      return;
    }

    set((state) => {
      state.captureProfiles.error =
        error instanceof Error
          ? error.message
          : "Unable to update selected capture profile";
    });
  }
}

function resolveCaptureTargetForNewProfile(
  get: () => BoundStore,
  game: GameId,
): CaptureTarget | undefined {
  const state = get();
  const selectedSource =
    state.capturePreview.sources.find(
      (source) => source.id === state.capturePreview.selectedSourceId,
    ) ?? null;
  if (
    selectedSource &&
    isCapturePreviewSourceAvailable(selectedSource) &&
    (!selectedSource.game || selectedSource.game === game)
  ) {
    return createCaptureTargetFromPreviewSource(selectedSource);
  }

  const selectedProfile = resolveCaptureProfileForGame(
    state.captureProfiles.items,
    state.captureProfiles.selectedProfileId,
    game,
  );

  return selectedProfile?.captureTarget ?? undefined;
}

function selectCapturePreviewSourceForGame(
  set: Parameters<BoundStoreStateCreator<CaptureProfilesSlice>>[0],
  get: () => BoundStore,
  captureTarget: CaptureTarget | null,
  game: GameId,
): void {
  const capturePreview = get().capturePreview;
  const selectedSourceId = resolveCapturePreviewSourceId(
    captureTarget,
    capturePreview.sources,
    capturePreview.selectedSourceId,
    game,
  );

  set((state) => {
    state.capturePreview.selectedSourceId = selectedSourceId;
  });
}

async function applyGameSettings(
  set: Parameters<BoundStoreStateCreator<CaptureProfilesSlice>>[0],
  get: () => BoundStore,
  game: GameId,
): Promise<void> {
  const settings = get().settings;
  const currentSettings = settings.value;
  const leagueKey = getLeagueSettingKey(game);
  const activeLeagues = getActiveLeagueNames(get, game);
  const nextLeague = normalizeLeagueForGame(
    game,
    currentSettings?.[leagueKey],
    activeLeagues,
  );
  const includeActiveLeague = canNormalizeLeagueSelection(get, game);
  const selectedCaptureProfileIdsByGame = currentSettings
    ? createValidSelectedProfileIdsByGame(
        get().captureProfiles.items,
        currentSettings.selectedCaptureProfileIdsByGame ?? {},
      )
    : {};
  delete selectedCaptureProfileIdsByGame[game];

  try {
    if (isCaptureProfileMutationBlocked(get)) {
      return;
    }

    await settings.update({
      activeGame: game,
      ...(includeActiveLeague
        ? { activeLeague: nextLeague, [leagueKey]: nextLeague }
        : {}),
      selectedCaptureProfileId: null,
      selectedCaptureProfileIdsByGame,
    });
  } catch (error) {
    if (isCaptureProfileMutationBlocked(get)) {
      return;
    }

    set((state) => {
      state.captureProfiles.error =
        error instanceof Error
          ? error.message
          : "Unable to persist selected capture profile";
    });
  }
}

function createSelectedProfileSettingsApplier(
  set: Parameters<BoundStoreStateCreator<CaptureProfilesSlice>>[0],
  get: () => BoundStore,
  getSelectedProfileIdsByGame: () => Partial<Record<GameId, string>>,
): (
  profile: Parameters<typeof createSettingsUpdateFromCaptureProfile>[0],
) => Promise<boolean> {
  let requestVersion = 0;

  return async (profile) => {
    const settings = get().settings;
    const currentSettings = settings.value;
    const currentSettingsWithProfileMemory = currentSettings
      ? {
          ...currentSettings,
          selectedCaptureProfileIdsByGame: createValidSelectedProfileIdsByGame(
            get().captureProfiles.items,
            currentSettings.selectedCaptureProfileIdsByGame ?? {},
            getSelectedProfileIdsByGame(),
            { [profile.game]: profile.id },
          ),
        }
      : currentSettings;
    const settingsUpdate = createSettingsUpdateFromCaptureProfile(
      profile,
      currentSettingsWithProfileMemory,
      {
        activeLeagues: getActiveLeagueNames(get, profile.game),
        includeActiveLeague: canNormalizeLeagueSelection(get, profile.game),
      },
    );
    if (isCaptureProfileMutationBlocked(get)) {
      return false;
    }
    if (
      currentSettings &&
      !shouldApplyCaptureProfileSettings(currentSettings, settingsUpdate)
    ) {
      return true;
    }

    requestVersion += 1;
    const currentRequestVersion = requestVersion;
    try {
      if (isCaptureProfileMutationBlocked(get)) {
        return false;
      }

      await settings.update(settingsUpdate);
      return true;
    } catch (error) {
      if (
        requestVersion !== currentRequestVersion ||
        isCaptureProfileMutationBlocked(get)
      ) {
        return false;
      }

      set((state) => {
        state.captureProfiles.error =
          error instanceof Error
            ? error.message
            : "Unable to persist selected capture profile";
      });
      return false;
    }
  };
}

function getActiveLeagueNames(get: () => BoundStore, game: GameId): string[] {
  return (
    get().poeLeagues?.byGame[game].map((league) => league.name) ?? [
      ...leagueOptions[game],
    ]
  );
}

function canNormalizeLeagueSelection(
  get: () => BoundStore,
  game: GameId,
): boolean {
  return canNormalizePoeLeagueSelection(get().poeLeagues?.statusByGame[game]);
}

function createValidSelectedProfileIdsByGame(
  profiles: CaptureProfile[],
  ...memories: Array<Partial<Record<GameId, string | null | undefined>>>
): AppSettings["selectedCaptureProfileIdsByGame"] {
  const selectedProfileIds: Partial<Record<GameId, string | null | undefined>> =
    {};
  for (const memory of memories) {
    Object.assign(selectedProfileIds, memory);
  }

  const validProfileIdsByGame: AppSettings["selectedCaptureProfileIdsByGame"] =
    {};
  for (const game of captureProfileMemoryGames) {
    const selectedProfileId = selectedProfileIds[game];
    if (
      selectedProfileId &&
      profiles.some(
        (profile) => profile.id === selectedProfileId && profile.game === game,
      )
    ) {
      validProfileIdsByGame[game] = selectedProfileId;
    }
  }

  return validProfileIdsByGame;
}

function shouldApplyCaptureProfileSettings(
  currentSettings: Partial<AppSettings>,
  settingsUpdate: Partial<AppSettings>,
): boolean {
  return (Object.keys(settingsUpdate) as Array<keyof AppSettings>).some(
    (key) =>
      !isCaptureProfileSettingValueEqual(
        key,
        currentSettings[key],
        settingsUpdate[key],
      ),
  );
}

function isCaptureProfileSettingValueEqual(
  key: keyof AppSettings,
  currentValue: AppSettings[keyof AppSettings] | undefined,
  nextValue: AppSettings[keyof AppSettings] | undefined,
): boolean {
  if (key !== "selectedCaptureProfileIdsByGame") {
    return currentValue === nextValue;
  }

  const currentMemory =
    currentValue as AppSettings["selectedCaptureProfileIdsByGame"];
  const nextMemory = nextValue as
    | AppSettings["selectedCaptureProfileIdsByGame"]
    | undefined;

  return (
    currentMemory.poe1 === nextMemory?.poe1 &&
    currentMemory.poe2 === nextMemory?.poe2
  );
}
