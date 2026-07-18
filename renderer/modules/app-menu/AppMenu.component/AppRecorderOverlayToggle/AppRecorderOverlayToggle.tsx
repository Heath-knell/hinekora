import clsx from "clsx";
import {
  RiPictureInPictureExitLine,
  RiPictureInPictureLine,
} from "react-icons/ri";

import { createRecorderOverlayDisabledReason } from "~/renderer/modules/managed-recorder/ManagedRecorder.components/CaptureModePageHeader/CaptureModePageHeader.utils";
import {
  useAppMenuShallow,
  useClientLogSelector,
  useManagedRecorderSelector,
  usePoeProcessSelector,
  useSettingsSelector,
} from "~/renderer/store";

import { appbarButtonClass } from "../AppMenu.utils";

const overlayIconSize = 16;

function AppRecorderOverlayToggle() {
  const recorderStatus = useManagedRecorderSelector(
    (managedRecorder) => managedRecorder.status,
  );
  const isActiveGameFocused = useClientLogSelector(
    (clientLog) => clientLog.status?.activeGameFocused ?? null,
  );
  const isAnyGameRunning = usePoeProcessSelector(
    (poeProcess) =>
      poeProcess.states.poe1.isRunning || poeProcess.states.poe2.isRunning,
  );
  const ignoreGameFocus = useSettingsSelector(
    (settings) => settings.value?.recorderOverlayIgnoreGameFocus ?? false,
  );
  const {
    isRecorderOverlayRequested,
    isRecorderOverlayVisible,
    toggleRecorderOverlay,
  } = useAppMenuShallow((appMenu) => ({
    isRecorderOverlayRequested: appMenu.isRecorderOverlayRequested,
    isRecorderOverlayVisible: appMenu.isRecorderOverlayVisible,
    toggleRecorderOverlay: appMenu.toggleRecorderOverlay,
  }));
  const recorderOverlayGameRunning = ignoreGameFocus
    ? isAnyGameRunning || recorderStatus?.gameRunning === true
    : recorderStatus?.gameRunning === true;
  const recorderOverlayDisabledReason = createRecorderOverlayDisabledReason(
    recorderStatus,
    recorderOverlayGameRunning,
  );
  const isShowRecordingOverlayBlockedByFocus =
    !ignoreGameFocus &&
    isRecorderOverlayRequested &&
    !isRecorderOverlayVisible &&
    isActiveGameFocused === false;
  const recordingOverlayFocusDisabledReason =
    isShowRecordingOverlayBlockedByFocus
      ? "Focus the selected Path of Exile game before showing the recording overlay."
      : null;
  const isRecorderOverlayDisabled =
    recorderOverlayDisabledReason !== null ||
    recordingOverlayFocusDisabledReason !== null;
  const overlayTooltip =
    recorderOverlayDisabledReason ??
    recordingOverlayFocusDisabledReason ??
    (isRecorderOverlayVisible
      ? "Hide recording overlay"
      : "Show recording overlay");
  const overlayLabel = isRecorderOverlayVisible
    ? "Hide Overlay"
    : "Show Overlay";

  const handleToggleRecorderOverlay = () => {
    if (isRecorderOverlayDisabled) {
      return;
    }

    void toggleRecorderOverlay();
  };

  return (
    <div className="tooltip tooltip-bottom" data-tip={overlayTooltip}>
      <button
        type="button"
        className={clsx(
          appbarButtonClass,
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        data-onboarding="overlay-icon"
        aria-label={overlayLabel}
        aria-pressed={isRecorderOverlayVisible}
        disabled={isRecorderOverlayDisabled}
        title={overlayLabel}
        onClick={handleToggleRecorderOverlay}
      >
        {isRecorderOverlayVisible ? (
          <RiPictureInPictureExitLine size={overlayIconSize} />
        ) : (
          <RiPictureInPictureLine size={overlayIconSize} />
        )}
      </button>
    </div>
  );
}

export { AppRecorderOverlayToggle };
