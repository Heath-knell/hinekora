import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import { type AppSettings, createDefaultSettings, type Profile } from "~/types";
import { createProfilesSlice } from "./Profiles.slice";

const updateSettings = vi.fn();

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    captureTarget: null,
    createdAt: "2026-06-18T00:00:00.000Z",
    cropRegions: [],
    game: null,
    id: "profile-1",
    name: "PoE 2",
    overlayPlacements: [],
    targetFps: 60,
    updatedAt: "2026-06-18T00:00:00.000Z",
    ...overrides,
  };
}

function createRenderableProfile(overrides: Partial<Profile> = {}): Profile {
  return createProfile({
    cropRegions: [
      {
        id: "crop-1",
        label: "Life",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
      },
    ],
    overlayPlacements: [
      {
        id: "placement-1",
        cropRegionId: "crop-1",
        x: 20,
        y: 20,
        scale: 1,
        opacity: 1,
      },
    ],
    ...overrides,
  });
}

function createTestStore() {
  return createBoundStoreForTests(
    (set, get, api) =>
      createProfilesSlice(set, get, api) as unknown as BoundStore,
  );
}

function createTestStoreWithSettings(settingsValue: AppSettings) {
  return createBoundStoreForTests(
    (set, get, api) =>
      ({
        ...(createProfilesSlice(set, get, api) as unknown as BoundStore),
        settings: {
          value: settingsValue,
          hydrate: vi.fn(),
          startListening: vi.fn(() => vi.fn()),
          update: updateSettings,
        },
      }) as unknown as BoundStore,
  );
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("Profiles slice", () => {
  const createdProfile = createProfile({ id: "created", name: "Created" });
  const profiles = [createProfile(), createProfile({ id: "profile-2" })];
  const createProfileApi = vi.fn();
  const listProfiles = vi.fn();
  const selectProfile = vi.fn();
  const updateProfile = vi.fn();
  const unsubscribe = vi.fn();
  let changedListener: ((items: Profile[]) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    changedListener = null;
    createProfileApi.mockResolvedValue(createdProfile);
    listProfiles.mockResolvedValue(profiles);
    selectProfile.mockResolvedValue(undefined);
    updateProfile.mockResolvedValue(profiles[1]);
    updateSettings.mockResolvedValue(undefined);

    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        profiles: {
          create: createProfileApi,
          list: listProfiles,
          select: selectProfile,
          update: updateProfile,
          onChanged: vi.fn((listener: (items: Profile[]) => void) => {
            changedListener = listener;
            return unsubscribe;
          }),
        },
        settings: {
          update: updateSettings,
        },
      },
    });
  });

  it("hydrates profiles and preserves an existing selected profile", async () => {
    const store = createTestStore();
    store.getState().profiles.select("profile-2");

    await store.getState().profiles.hydrate();

    expect(store.getState().profiles).toMatchObject({
      error: null,
      isLoading: false,
      items: profiles,
      selectedProfileId: "profile-2",
    });
  });

  it("hydrates the persisted selected profile from settings", async () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-2",
    });

    await store.getState().profiles.hydrate();

    expect(store.getState().profiles.selectedProfileId).toBe("profile-2");
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("persists the fallback profile when the persisted selected profile is missing", async () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "missing",
    });

    await store.getState().profiles.hydrate();

    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");
    expect(selectProfile).toHaveBeenCalledWith("profile-1");
  });

  it("uses a renderable profile before an empty default when falling back", async () => {
    const emptyDefault = createProfile({
      id: "empty-default",
      name: "Default PoE 2",
    });
    const configuredProfile = createRenderableProfile({
      id: "configured",
      name: "Configured",
    });
    listProfiles.mockResolvedValueOnce([emptyDefault, configuredProfile]);
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "missing",
    });

    await store.getState().profiles.hydrate();

    expect(store.getState().profiles.selectedProfileId).toBe("configured");
    expect(selectProfile).toHaveBeenCalledWith("configured");
  });

  it("does not let a late hydrate overwrite profile change events", async () => {
    const hydrateProfiles = createDeferred<Profile[]>();
    const eventProfile = createProfile({ id: "event-profile" });
    listProfiles.mockReturnValueOnce(hydrateProfiles.promise);
    const store = createTestStoreWithSettings(createDefaultSettings());
    store.getState().profiles.startListening();

    const hydrateRequest = store.getState().profiles.hydrate();
    changedListener?.([eventProfile]);
    hydrateProfiles.resolve(profiles);
    await hydrateRequest;

    expect(store.getState().profiles.items).toEqual([eventProfile]);
    expect(store.getState().profiles.selectedProfileId).toBe("event-profile");
    expect(store.getState().profiles.isLoading).toBe(false);
  });

  it("does not let a late hydrate overwrite local profile mutations", async () => {
    const hydrateProfiles = createDeferred<Profile[]>();
    listProfiles
      .mockReturnValueOnce(hydrateProfiles.promise)
      .mockResolvedValueOnce([createdProfile]);
    const store = createTestStoreWithSettings(createDefaultSettings());

    const hydrateRequest = store.getState().profiles.hydrate();
    await store.getState().profiles.create("Mapper");
    hydrateProfiles.resolve(profiles);
    await hydrateRequest;

    expect(store.getState().profiles.items).toEqual([createdProfile]);
    expect(store.getState().profiles.selectedProfileId).toBe(createdProfile.id);
    expect(store.getState().profiles.isLoading).toBe(false);
  });

  it("persists selected profile changes through the narrow profiles API", () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-1",
    });

    store.getState().profiles.select("profile-2");

    expect(selectProfile).toHaveBeenCalledWith("profile-2");
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("persists scoped overlay profile selection when settings update is unavailable", () => {
    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        profiles: window.electron.profiles,
        settings: {},
      },
    });
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-1",
    });

    store.getState().profiles.select("profile-2");

    expect(store.getState().profiles.selectedProfileId).toBe("profile-2");
    expect(selectProfile).toHaveBeenCalledWith("profile-2");
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it("rolls back selected profile changes when profile selection persistence fails", async () => {
    selectProfile.mockRejectedValueOnce(new Error("write failed"));
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-1",
    });
    await store.getState().profiles.hydrate();

    store.getState().profiles.select("profile-2");
    expect(store.getState().profiles.selectedProfileId).toBe("profile-2");

    await vi.waitFor(() => {
      expect(store.getState().profiles.error).toBe("write failed");
    });
    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");
  });

  it("does not roll back a newer selected profile after an older persistence failure", async () => {
    selectProfile
      .mockRejectedValueOnce(new Error("write failed"))
      .mockResolvedValueOnce(undefined);
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-1",
    });
    await store.getState().profiles.hydrate();

    store.getState().profiles.select("profile-2");
    store.getState().profiles.select("profile-1");

    await vi.waitFor(() => {
      expect(selectProfile).toHaveBeenCalledTimes(2);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");
    expect(store.getState().profiles.error).toBeNull();
  });

  it("falls back to the first profile and stores hydrate errors", async () => {
    const store = createTestStore();
    store.getState().profiles.select("missing");

    await store.getState().profiles.hydrate();
    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");

    listProfiles.mockRejectedValueOnce(new Error("offline"));
    await store.getState().profiles.hydrate();
    expect(store.getState().profiles.error).toBe("offline");

    listProfiles.mockRejectedValueOnce("offline");
    await store.getState().profiles.hydrate();
    expect(store.getState().profiles.error).toBe("Load failed");

    listProfiles.mockResolvedValueOnce([]);
    await store.getState().profiles.hydrate();
    expect(store.getState().profiles.selectedProfileId).toBeNull();
  });

  it("creates and updates profiles", async () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      activeGame: "poe2",
    });

    await store.getState().profiles.create("Mapper");
    expect(createProfileApi).toHaveBeenCalledWith({
      name: "Mapper",
    });
    expect(store.getState().profiles.selectedProfileId).toBe("created");

    await store
      .getState()
      .profiles.update({ id: "profile-2", name: "Renamed" });
    expect(updateProfile).toHaveBeenCalledWith({
      id: "profile-2",
      name: "Renamed",
    });
    expect(store.getState().profiles.selectedProfileId).toBe("profile-2");
  });

  it("persists the selected profile after profile updates", async () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-1",
    });

    await store
      .getState()
      .profiles.update({ id: "profile-2", name: "Renamed" });

    expect(selectProfile).toHaveBeenCalledWith("profile-2");
  });

  it("listens for profile changes and cleans up", () => {
    const store = createTestStore();
    const stopListening = store.getState().profiles.startListening();

    changedListener?.(profiles);
    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");

    store.getState().profiles.select("profile-2");
    changedListener?.(profiles);
    expect(store.getState().profiles.selectedProfileId).toBe("profile-2");

    changedListener?.([profiles[0]!]);
    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");

    changedListener?.([]);
    expect(store.getState().profiles.selectedProfileId).toBeNull();

    stopListening();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("persists the fallback profile after profile change events remove the selected profile", () => {
    const store = createTestStoreWithSettings({
      ...createDefaultSettings(),
      selectedProfileId: "profile-2",
    });
    const stopListening = store.getState().profiles.startListening();

    store.getState().profiles.select("profile-2");
    selectProfile.mockClear();
    changedListener?.([profiles[0]!]);

    expect(store.getState().profiles.selectedProfileId).toBe("profile-1");
    expect(selectProfile).toHaveBeenCalledWith("profile-1");

    stopListening();
  });
});
