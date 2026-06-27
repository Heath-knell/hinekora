import type { Profile } from "~/types";
import type { AuraProfileUpdate } from "../AuraOverlay.page.utils.types";

function createAuraProfileUpdateDeletingPlacement(
  profile: Pick<Profile, "id" | "cropRegions" | "overlayPlacements">,
  placementId: string,
): AuraProfileUpdate | null {
  const placement = profile.overlayPlacements.find(
    (item) => item.id === placementId,
  );
  if (!placement) {
    return null;
  }

  return {
    id: profile.id,
    cropRegions: profile.cropRegions.filter(
      (region) => region.id !== placement.cropRegionId,
    ),
    overlayPlacements: profile.overlayPlacements.filter(
      (item) => item.cropRegionId !== placement.cropRegionId,
    ),
  };
}

export { createAuraProfileUpdateDeletingPlacement };
