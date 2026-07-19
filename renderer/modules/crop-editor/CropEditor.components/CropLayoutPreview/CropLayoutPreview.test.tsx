import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  updateProfileFromCurrent: vi.fn(),
  useCapturePreviewShallow: vi.fn(),
  useCropEditorShallow: vi.fn(),
  useProfilesShallow: vi.fn(),
  useSettingsSelector: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCapturePreviewShallow: storeMocks.useCapturePreviewShallow,
  useCropEditorShallow: storeMocks.useCropEditorShallow,
  useProfilesShallow: storeMocks.useProfilesShallow,
  useSettingsSelector: storeMocks.useSettingsSelector,
}));

import { CropLayoutPreview } from "./CropLayoutPreview";

const profile = {
  captureTarget: {
    height: 1080,
    id: "display-primary",
    kind: "display" as const,
    label: "Primary",
    width: 1920,
  },
  createdAt: new Date(0).toISOString(),
  cropRegions: [
    {
      height: 80,
      id: "crop-1",
      label: "Aura 1",
      referenceHeight: 1440,
      referenceWidth: 2560,
      width: 200,
      x: 100,
      y: 50,
    },
  ],
  game: "poe1" as const,
  id: "profile-1",
  name: "Default",
  overlayPlacements: [],
  targetFps: 30,
  updatedAt: new Date(0).toISOString(),
};

describe("CropLayoutPreview", () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    storeMocks.updateProfileFromCurrent.mockResolvedValue(undefined);
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        items: [profile],
        selectedProfileId: profile.id,
        updateFromCurrent: storeMocks.updateProfileFromCurrent,
      }),
    );
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        selectedAuraCropRegionId: "crop-1",
        showAllAurasInPreview: false,
      }),
    );
    storeMocks.useSettingsSelector.mockImplementation((selector) =>
      selector({ value: { activeGame: "poe1" } }),
    );
    storeMocks.useCapturePreviewShallow.mockImplementation((selector) =>
      selector({
        getThumbnail: vi.fn(),
        selectedSourceId: "screen:primary",
        sources: [
          {
            displayId: "display-primary",
            height: 1080,
            id: "screen:primary",
            kind: "screen",
            name: "Primary",
            thumbnailDataUrl: null,
            width: 1920,
          },
        ],
        thumbnailsBySourceId: {
          "screen:primary": "data:image/png;base64,preview",
        },
      }),
    );
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("persists resized dimensions in the crop reference viewport", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<CropLayoutPreview />);
    });
    const stage = container.querySelector<HTMLElement>(
      '[aria-label="Aura layout preview"] > div:last-child',
    );
    const handle = container.querySelector<HTMLElement>(
      '[data-region-id="crop-1"][data-corner="se"]',
    );
    expect(stage).toBeInstanceOf(HTMLElement);
    expect(handle).toBeInstanceOf(HTMLElement);
    vi.spyOn(stage as HTMLElement, "getBoundingClientRect").mockReturnValue({
      bottom: 540,
      height: 540,
      left: 0,
      right: 960,
      toJSON: () => ({}),
      top: 0,
      width: 960,
      x: 0,
      y: 0,
    });
    Object.assign(handle as HTMLElement, {
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    });

    await act(async () => {
      handle?.dispatchEvent(
        new MouseEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientX: 100,
          clientY: 100,
        }),
      );
    });
    await act(async () => {
      handle?.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 175,
          clientY: 130,
        }),
      );
    });
    await act(async () => {
      handle?.dispatchEvent(
        new MouseEvent("pointerup", {
          bubbles: true,
          clientX: 190,
          clientY: 145,
        }),
      );
    });

    expect(storeMocks.updateProfileFromCurrent).toHaveBeenCalledOnce();
    const createInput = storeMocks.updateProfileFromCurrent.mock.calls[0]?.[1];
    expect(createInput(profile)).toEqual({
      cropRegions: [expect.objectContaining({ height: 200, width: 440 })],
    });
  });
});
