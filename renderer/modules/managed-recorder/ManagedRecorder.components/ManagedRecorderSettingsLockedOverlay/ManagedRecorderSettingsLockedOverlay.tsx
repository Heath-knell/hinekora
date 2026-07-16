import { FiLock } from "react-icons/fi";

import { useManagedRecorderSettingsLockState } from "../../ManagedRecorder.hooks/useManagedRecorderSettingsLockState/useManagedRecorderSettingsLockState";

function ManagedRecorderSettingsLockedOverlay() {
  const { canUnlock, isLocked, message, title, unlockSettings } =
    useManagedRecorderSettingsLockState();

  if (!isLocked) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center rounded-md bg-base-200/55 p-3 pt-5 backdrop-blur-[1px]">
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-base-content/15 bg-base-100/95 p-3 text-left shadow-sm">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-base-200 text-base-content/65">
          <FiLock aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <strong className="block text-base-content text-sm">{title}</strong>
          <span className="mt-0.5 block text-base-content/60 text-xs">
            {message}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-xs shrink-0 border border-base-content/15"
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
