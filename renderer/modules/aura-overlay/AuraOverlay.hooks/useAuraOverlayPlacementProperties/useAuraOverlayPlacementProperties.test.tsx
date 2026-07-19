import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ProfilesSlice } from "~/renderer/store/store.types";

import type { Profile } from "~/types";
import type { AuraPlacementPropertiesPatch } from "../../AuraOverlay.components/AuraPlacementPropertiesPanel/AuraPlacementPropertiesPanel";
import { useAuraOverlayPlacementProperties } from "./useAuraOverlayPlacementProperties";

const profile: Profile = {
  captureTarget: null,
  createdAt: new Date(0).toISOString(),
  cropRegions: [
    {
      height: 40,
      id: "crop-1",
      label: "Aura",
      width: 100,
      x: 10,
      y: 20,
    },
  ],
  game: "poe1",
  id: "profile-1",
  name: "Default",
  overlayPlacements: [
    {
      cropRegionId: "crop-1",
      id: "placement-1",
      opacity: 1,
      scale: 1,
      x: 30,
      y: 40,
    },
  ],
  targetFps: 30,
  updatedAt: new Date(0).toISOString(),
};

describe("useAuraOverlayPlacementProperties", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("consumes rejected fire-and-forget profile updates", async () => {
    const updateProfile = vi
      .fn<ProfilesSlice["profiles"]["update"]>()
      .mockRejectedValue(new Error("write failed"));
    let handleChange:
      | ((placementId: string, patch: AuraPlacementPropertiesPatch) => void)
      | null = null;

    function HookHarness() {
      ({ handlePlacementPropertiesChange: handleChange } =
        useAuraOverlayPlacementProperties({
          profile,
          recordAuraHistory: vi.fn(() => true),
          referenceViewport: null,
          targetViewport: { height: 1080, width: 1920 },
          updateProfile,
        }));

      return null;
    }

    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(<HookHarness />);
    });

    await act(async () => {
      handleChange?.("placement-1", { opacity: 0.5 });
      await Promise.resolve();
    });

    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: profile.id,
        overlayPlacements: [expect.objectContaining({ opacity: 0.5 })],
      }),
    );
  });
});
