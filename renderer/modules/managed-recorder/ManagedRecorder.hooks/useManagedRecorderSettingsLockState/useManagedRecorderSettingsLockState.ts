import { useCaptureProfilesShallow } from "~/renderer/store";

import { useManagedRecorderActive } from "../useManagedRecorderActive/useManagedRecorderActive";

interface ManagedRecorderSettingsLockState {
  canUnlock: boolean;
  isLocked: boolean;
  message: string;
  title: string;
  unlockSettings: () => void;
}

function useManagedRecorderSettingsLockState(): ManagedRecorderSettingsLockState {
  const { isProfileUnlocked, selectedProfileId, setProfileUnlocked } =
    useCaptureProfilesShallow((captureProfiles) => ({
      isProfileUnlocked: captureProfiles.isProfileUnlocked,
      selectedProfileId: captureProfiles.selectedProfileId,
      setProfileUnlocked: captureProfiles.setProfileUnlocked,
    }));
  const isRecorderActive = useManagedRecorderActive();
  const isProfileLocked = selectedProfileId !== null && !isProfileUnlocked;

  const unlockSettings = () => {
    if (isRecorderActive || !isProfileLocked) {
      return;
    }

    setProfileUnlocked(true);
  };

  if (isRecorderActive) {
    return {
      canUnlock: false,
      isLocked: true,
      message: "Settings are locked during recording or rewind.",
      title: "Settings locked",
      unlockSettings,
    };
  }

  if (isProfileLocked) {
    return {
      canUnlock: true,
      isLocked: true,
      message: "Settings are locked because the selected profile is locked.",
      title: "Settings locked",
      unlockSettings,
    };
  }

  return {
    canUnlock: false,
    isLocked: false,
    message: "",
    title: "",
    unlockSettings,
  };
}

export { useManagedRecorderSettingsLockState };
