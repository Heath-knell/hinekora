import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
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

import { OverlayPlacementsEditor } from "./OverlayPlacementsEditor";

const profile = {
  id: "profile-1",
  name: "Default",
  game: "poe1",
  targetFps: 30,
  captureTarget: null,
  cropRegions: [
    {
      arc: {
        controlX: 50,
        controlY: 10,
        endX: 100,
        endY: 70,
        startX: 0,
        startY: 70,
        thickness: 20,
      },
      height: 80,
      id: "crop-arc",
      label: "Arched aura",
      shape: "arc" as const,
      width: 120,
      x: 100,
      y: 120,
    },
    {
      height: 80,
      id: "crop-points",
      label: "Pointer aura",
      points: [
        { x: 10, y: 10 },
        { x: 70, y: 50 },
      ],
      shape: "points" as const,
      width: 120,
      x: 200,
      y: 220,
    },
  ],
  overlayPlacements: [
    {
      cropRegionId: "crop-arc",
      id: "placement-arc",
      opacity: 1,
      scale: 1,
      x: 40,
      y: 50,
    },
    {
      cropRegionId: "crop-points",
      id: "placement-points",
      opacity: 1,
      scale: 1,
      x: 60,
      y: 70,
    },
  ],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
let currentProfile = profile;

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setSelectValue(select: HTMLSelectElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  )?.set;
  valueSetter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("OverlayPlacementsEditor", () => {
  let root: Root | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    currentProfile = profile;
    storeMocks.updateProfile.mockResolvedValue(undefined);
    storeMocks.updateProfileFromCurrent.mockImplementation(
      async (_profileId, createInput) => {
        const update = createInput(currentProfile);
        if (!update) {
          return;
        }
        currentProfile = { ...currentProfile, ...update };
        await storeMocks.updateProfile({ id: currentProfile.id, ...update });
      },
    );
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        items: [profile],
        selectedProfileId: "profile-1",
        updateFromCurrent: storeMocks.updateProfileFromCurrent,
      }),
    );
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        selectedAuraCropRegionId: "crop-arc",
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

  it("renders the latest arched aura placement controls", () => {
    const html = renderToStaticMarkup(<OverlayPlacementsEditor />);

    expect(html).toContain(">Left<");
    expect(html).toContain(">Top<");
    expect(html).toContain(">Scale<");
    expect(html).toContain(">Opacity<");
    expect(html).toContain(">Thickness<");
    expect(html).toContain(">Mirrored<");
    expect(html).toContain(">Straightened<");
    expect(html).toContain(">Rotation<");
    expect(html).toMatch(/Scale[\s\S]*Thickness[\s\S]*Opacity[\s\S]*Rotation/);
    expect(html).not.toContain(">size<");
    expect(html).not.toContain("<img");
    expect(html).toContain("right-[10px] bottom-[10px]");
    expect(html).toContain("mix-blend-screen");
    expect(html).toContain("opacity-10");
    const controls = document.createElement("div");
    controls.innerHTML = html;
    expect(
      Array.from(
        controls.querySelectorAll('input[type="number"], select'),
      ).every((control) => control.classList.contains("bg-base-100/[0.01]")),
    ).toBe(true);
  });

  it("updates opacity, mirror state, thickness, and rotation", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<OverlayPlacementsEditor />);
      await Promise.resolve();
    });

    const opacityInput = container.querySelector<HTMLInputElement>(
      'input[data-field="opacity"]',
    );
    const thicknessInput = container.querySelector<HTMLInputElement>(
      'input[data-field="arcVisibleThickness"]',
    );
    const mirrorInput = container.querySelector<HTMLInputElement>(
      'input[data-field="mirrored"]',
    );
    const rotationSelect = container.querySelector<HTMLSelectElement>("select");
    expect(opacityInput).toBeInstanceOf(HTMLInputElement);
    expect(thicknessInput).toBeInstanceOf(HTMLInputElement);
    expect(mirrorInput).toBeInstanceOf(HTMLInputElement);
    expect(rotationSelect).toBeInstanceOf(HTMLSelectElement);

    await act(async () => {
      setInputValue(opacityInput as HTMLInputElement, "0.45");
      setInputValue(thicknessInput as HTMLInputElement, "32");
      mirrorInput?.click();
      setSelectValue(rotationSelect as HTMLSelectElement, "90");
    });

    expect(storeMocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayPlacements: expect.arrayContaining([
          expect.objectContaining({ id: "placement-arc", opacity: 0.45 }),
        ]),
      }),
    );
    expect(storeMocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayPlacements: expect.arrayContaining([
          expect.objectContaining({
            arcVisibleThickness: 32,
            id: "placement-arc",
          }),
        ]),
      }),
    );
    expect(storeMocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayPlacements: expect.arrayContaining([
          expect.objectContaining({ id: "placement-arc", mirrored: true }),
        ]),
      }),
    );
    expect(storeMocks.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        overlayPlacements: expect.arrayContaining([
          expect.objectContaining({ id: "placement-arc", rotationDegrees: 90 }),
        ]),
      }),
    );
    expect(storeMocks.updateProfile).toHaveBeenLastCalledWith(
      expect.objectContaining({
        overlayPlacements: expect.arrayContaining([
          expect.objectContaining({
            arcVisibleThickness: 32,
            id: "placement-arc",
            mirrored: true,
            opacity: 0.45,
            rotationDegrees: 90,
          }),
        ]),
      }),
    );
  });

  it("renders pointer thickness and spacing controls", () => {
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        selectedAuraCropRegionId: "crop-points",
      }),
    );

    const html = renderToStaticMarkup(<OverlayPlacementsEditor />);

    expect(html).toContain(">Thickness<");
    expect(html).toContain(">Spacing<");
    expect(html).not.toContain(">Straightened<");
  });

  it("keeps rectangular aura inputs in two columns", async () => {
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        items: [
          {
            ...profile,
            cropRegions: [
              {
                height: 80,
                id: "crop-rect",
                label: "Rect aura",
                width: 120,
                x: 100,
                y: 120,
              },
            ],
            overlayPlacements: [
              {
                cropRegionId: "crop-rect",
                id: "placement-rect",
                opacity: 1,
                scale: 1,
                x: 40,
                y: 50,
              },
            ],
          },
        ],
        selectedProfileId: "profile-1",
        updateFromCurrent: storeMocks.updateProfileFromCurrent,
      }),
    );
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        selectedAuraCropRegionId: "crop-rect",
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<OverlayPlacementsEditor />);
      await Promise.resolve();
    });

    const scaleInput = container.querySelector<HTMLInputElement>(
      'input[data-field="scale"]',
    );
    const opacityInput = container.querySelector<HTMLInputElement>(
      'input[data-field="opacity"]',
    );

    expect(scaleInput?.parentElement?.className).not.toContain("col-span-2");
    expect(opacityInput?.parentElement?.className).toContain("col-start-1");
    expect(
      opacityInput?.parentElement?.nextElementSibling?.textContent,
    ).toContain("Rotation");
  });

  it("adds top spacing to the mirrored and straightened row", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<OverlayPlacementsEditor />);
      await Promise.resolve();
    });

    const mirrorInput = container.querySelector<HTMLInputElement>(
      'input[data-field="mirrored"]',
    );
    const straightenedInput = container.querySelector<HTMLInputElement>(
      'input[data-field="arcStraightened"]',
    );

    expect(mirrorInput?.parentElement?.className).toContain("mt-1");
    expect(straightenedInput?.parentElement?.className).toContain("mt-1");
  });
});
