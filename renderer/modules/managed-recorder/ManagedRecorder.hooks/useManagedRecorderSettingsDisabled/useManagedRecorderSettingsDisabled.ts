import { useCaptureProfilesShallow } from "~/renderer/store";

import { useManagedRecorderActive } from "../useManagedRecorderActive/useManagedRecorderActive";

function useManagedRecorderSettingsDisabled(): boolean {
  const isProfileLocked = useCaptureProfilesShallow(
    (captureProfiles) =>
      captureProfiles.selectedProfileId !== null &&
      !captureProfiles.isProfileUnlocked,
  );
  const isRecorderActive = useManagedRecorderActive();

  return isProfileLocked || isRecorderActive;
}

export { useManagedRecorderSettingsDisabled };
