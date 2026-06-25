import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";
import { createBoundStoreForTests } from "~/renderer/test/createBoundStoreForTests";

import type { CapturePreviewSource, Profile } from "~/types";
import { createCapturePreviewSlice } from "./CapturePreview.slice";

const source: CapturePreviewSource = {
  displayId: "1",
  height: 1080,
  id: "screen:1",
  kind: "screen",
  name: "Screen 1",
  thumbnailDataUrl: null,
  width: 1920,
};

const nextSource: CapturePreviewSource = {
  ...source,
  displayId: "2",
  id: "screen:2",
  name: "Screen 2",
};

const profile: Profile = {
  captureTarget: {
    height: 1080,
    id: "screen:1",
    kind: "display",
    label: "Screen 1",
    width: 1920,
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  cropRegions: [],
  game: "poe2",
  id: "profile-1",
  name: "PoE 2",
  overlayPlacements: [],
  targetFps: 60,
  updatedAt: "2026-06-18T00:00:00.000Z",
};

function createTestStore() {
  return createBoundStoreForTests((set, get, api) => {
    const capturePreviewSlice = createCapturePreviewSlice(set, get, api);

    return {
      ...capturePreviewSlice,
      profiles: {
        error: null,
        hydrate: vi.fn(),
        isLoading: false,
        items: [profile],
        selectedProfileId: profile.id,
        create: vi.fn(),
        update: vi.fn(),
        select: vi.fn(),
        startListening: vi.fn(),
      },
    } as unknown as BoundStore;
  });
}

function createTestStoreWithoutSelectedProfile() {
  const store = createTestStore();
  store.setState((state) => ({
    profiles: {
      ...state.profiles,
      selectedProfileId: "missing",
    },
  }));

  return store;
}

describe("CapturePreview slice", () => {
  const getSourceThumbnail = vi.fn();
  const listSources = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSourceThumbnail.mockResolvedValue("data:image/png;base64,screen");
    listSources.mockResolvedValue([source]);

    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        capturePreview: {
          getSourceThumbnail,
          listSources,
        },
      },
    });
  });

  it("hydrates and resolves the selected source from the selected profile", async () => {
    const store = createTestStore();

    await store.getState().capturePreview.hydrate();
    store.getState().capturePreview.select("screen:manual");
    await store.getState().capturePreview.refresh({ force: true });

    expect(listSources).toHaveBeenLastCalledWith(true);
    expect(store.getState().capturePreview).toMatchObject({
      error: null,
      isLoading: false,
      selectedSourceId: "screen:1",
      sources: [source],
    });
  });

  it("stores list errors", async () => {
    const store = createTestStore();
    listSources.mockRejectedValueOnce("blocked");

    await store.getState().capturePreview.refresh();

    expect(store.getState().capturePreview).toMatchObject({
      error: "Unable to list capture sources",
      isLoading: false,
    });
  });

  it("keeps an existing source when no selected profile target is available", async () => {
    const store = createTestStoreWithoutSelectedProfile();
    store.getState().capturePreview.select("screen:manual");

    await store.getState().capturePreview.refresh();

    expect(store.getState().capturePreview.selectedSourceId).toBe("screen:1");
  });

  it("stores error messages from Error objects", async () => {
    const store = createTestStore();
    listSources.mockRejectedValueOnce(new Error("No permission"));

    await store.getState().capturePreview.refresh();

    expect(store.getState().capturePreview.error).toBe("No permission");
  });

  it("loads and caches source thumbnails separately from source metadata", async () => {
    const store = createTestStore();

    await expect(
      store.getState().capturePreview.getThumbnail("screen:1"),
    ).resolves.toBe("data:image/png;base64,screen");
    await expect(
      store.getState().capturePreview.getThumbnail("screen:1"),
    ).resolves.toBe("data:image/png;base64,screen");

    expect(getSourceThumbnail).toHaveBeenCalledTimes(1);
    expect(getSourceThumbnail).toHaveBeenCalledWith("screen:1");
    expect(store.getState().capturePreview.thumbnailsBySourceId).toEqual({
      "screen:1": "data:image/png;base64,screen",
    });
  });

  it("prunes cached thumbnails when refreshed sources no longer include them", async () => {
    const store = createTestStore();

    await store.getState().capturePreview.getThumbnail("screen:1");
    listSources.mockResolvedValueOnce([nextSource]);
    await store.getState().capturePreview.refresh();

    expect(store.getState().capturePreview.thumbnailsBySourceId).toEqual({});
  });

  it("caps retained cached thumbnails", async () => {
    getSourceThumbnail.mockImplementation(
      async (sourceId: string) => `data:image/png;base64,${sourceId}`,
    );
    const store = createTestStore();

    for (let index = 0; index < 18; index += 1) {
      await store.getState().capturePreview.getThumbnail(`screen:${index}`);
    }

    expect(
      Object.keys(store.getState().capturePreview.thumbnailsBySourceId),
    ).toHaveLength(16);
    expect(
      store.getState().capturePreview.thumbnailsBySourceId["screen:0"],
    ).toBeUndefined();
    expect(
      store.getState().capturePreview.thumbnailsBySourceId["screen:17"],
    ).toBe("data:image/png;base64,screen:17");
  });
});
