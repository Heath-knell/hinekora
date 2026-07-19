import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  selectAura: vi.fn(),
  useCropEditorShallow: vi.fn(),
  useProfilesShallow: vi.fn(),
  useSettingsSelector: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileFromCurrent: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCropEditorShallow: storeMocks.useCropEditorShallow,
  useProfilesShallow: storeMocks.useProfilesShallow,
  useSettingsSelector: storeMocks.useSettingsSelector,
}));

import { CropRegionsEditor } from "./CropRegionsEditor";

const profile = {
  id: "profile-1",
  name: "Default",
  game: "poe1",
  targetFps: 30,
  captureTarget: null,
  cropRegions: [
    {
      height: 80,
      id: "crop-1",
      label: "Aura 1",
      width: 120,
      x: 100,
      y: 120,
    },
  ],
  overlayPlacements: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
let currentProfile = profile;

describe("CropRegionsEditor", () => {
  let root: Root | null = null;

  beforeEach(() => {
    currentProfile = profile;
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        items: [currentProfile],
        selectedProfileId: "profile-1",
        update: storeMocks.updateProfile,
        updateFromCurrent: storeMocks.updateProfileFromCurrent,
      }),
    );
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        selectAura: storeMocks.selectAura,
        selectedAuraCropRegionId: "crop-1",
      }),
    );
    storeMocks.useSettingsSelector.mockImplementation((selector) =>
      selector({ value: { activeGame: "poe1" } }),
    );
  });

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("renders capitalized source area labels", () => {
    const html = renderToStaticMarkup(<CropRegionsEditor />);

    expect(html).toContain(">Name<");
    expect(html).toContain(">Screen X<");
    expect(html).toContain(">Screen Y<");
    expect(html).toContain(">Width<");
    expect(html).toContain(">Height<");
    expect(html).not.toContain("right-[10px] bottom-[10px]");
    const controls = document.createElement("div");
    controls.innerHTML = html;
    expect(
      Array.from(controls.querySelectorAll("input")).every((control) =>
        control.classList.contains("bg-base-100/[0.01]"),
      ),
    ).toBe(true);
  });

  it("resynchronizes the controlled name when the aura is renamed elsewhere", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<CropRegionsEditor />);
    });
    const nameInput = container.querySelector<HTMLInputElement>(
      'input[data-region-id="crop-1"]:not([type="number"])',
    );
    expect(nameInput?.value).toBe("Aura 1");

    currentProfile = {
      ...profile,
      cropRegions: [{ ...profile.cropRegions[0]!, label: "Renamed aura" }],
    };
    await act(async () => {
      root?.render(<CropRegionsEditor />);
    });

    expect(nameInput?.value).toBe("Renamed aura");
  });
});
