import {
  useCaptureProfilesShallow,
  useManagedRecorderShallow,
} from "~/renderer/store";

import { isManagedRecorderStatusActive } from "../../ManagedRecorder.utils/ManagedRecorder.utils";

function useManagedRecorderSettingsDisabled(): boolean {
  const isProfileLocked = useCaptureProfilesShallow(
    (captureProfiles) =>
      captureProfiles.selectedProfileId !== null &&
      !captureProfiles.isProfileUnlocked,
  );
  const isRecorderActive = useManagedRecorderShallow((managedRecorder) =>
    isManagedRecorderStatusActive(managedRecorder.status),
  );

  return isProfileLocked || isRecorderActive;
}

export { useManagedRecorderSettingsDisabled };
