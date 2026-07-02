import { FiLock } from "react-icons/fi";

import { useManagedRecorderSettingsLockState } from "../../ManagedRecorder.hooks/useManagedRecorderSettingsLockState/useManagedRecorderSettingsLockState";

function ManagedRecorderSettingsLockedOverlay() {
  const { canUnlock, isLocked, message, title, unlockSettings } =
    useManagedRecorderSettingsLockState();

  if (!isLocked) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border border-primary/20 bg-neutral/90 p-4 text-center shadow-inner backdrop-blur-[1px]">
      <div className="grid max-w-72 justify-items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/25 bg-base-200 text-primary">
          <FiLock aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="grid gap-1">
          <strong className="text-primary text-sm">{title}</strong>
          <span className="text-base-content/75 text-xs">{message}</span>
        </div>
        <button
          className="btn btn-primary btn-xs mt-1"
          disabled={!canUnlock}
          title={
            canUnlock
              ? "Unlock settings"
              : "Stop recording or rewind before unlocking settings"
          }
          type="button"
          onClick={unlockSettings}
        >
          Unlock settings
        </button>
      </div>
    </div>
  );
}

export { ManagedRecorderSettingsLockedOverlay };
