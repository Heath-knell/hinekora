import type {
  AuraHistorySnapshot,
  AuraProfileUpdate,
} from "../AuraOverlay.page.utils.types";

function createAuraProfileUpdateFromSnapshot(
  profileId: string,
  snapshot: AuraHistorySnapshot,
): AuraProfileUpdate {
  return {
    id: profileId,
    cropRegions: snapshot.cropRegions.map((region) => ({ ...region })),
    overlayPlacements: snapshot.overlayPlacements.map((placement) => ({
      ...placement,
    })),
  };
}

export { createAuraProfileUpdateFromSnapshot };
