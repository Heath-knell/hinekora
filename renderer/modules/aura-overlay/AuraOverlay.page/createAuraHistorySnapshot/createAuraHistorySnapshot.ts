import type { Profile } from "~/types";
import type { AuraHistorySnapshot } from "../AuraOverlay.page.utils.types";

function createAuraHistorySnapshot(
  profile: Pick<Profile, "cropRegions" | "overlayPlacements">,
): AuraHistorySnapshot {
  return {
    cropRegions: profile.cropRegions.map((region) => ({ ...region })),
    overlayPlacements: profile.overlayPlacements.map((placement) => ({
      ...placement,
    })),
  };
}

export { createAuraHistorySnapshot };
