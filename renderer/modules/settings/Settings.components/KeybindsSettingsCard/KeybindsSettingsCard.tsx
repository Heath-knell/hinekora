import { FiInfo } from "react-icons/fi";

import { InternalKeybindsSection } from "~/renderer/modules/settings/Settings.components/InternalKeybindsSection/InternalKeybindsSection";
import { KeybindsSettingsRow } from "~/renderer/modules/settings/Settings.components/KeybindsSettingsRow/KeybindsSettingsRow";
import { useSettingsShallow } from "~/renderer/store";

import { keybindActions } from "~/types";
import {
  isKeybindEditingDisabled,
  type KeybindSettingsValue,
  readSavedAccelerator,
  resolveKeybindEditingDisabledMessage,
} from "./KeybindsSettingsCard.utils";
import { useKeybindsSettingsCapture } from "./useKeybindsSettingsCapture/useKeybindsSettingsCapture";
import { useKeybindsSettingsRecorderStatus } from "./useKeybindsSettingsRecorderStatus/useKeybindsSettingsRecorderStatus";
import { useKeybindsSettingsRegistrationStatus } from "./useKeybindsSettingsRegistrationStatus/useKeybindsSettingsRegistrationStatus";

const KEYBIND_EDITING_NOTICE =
  "Global keybinds can only be changed while recording and rewind are stopped.";

function KeybindsSettingsCard() {
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));
  const keybindSettingsValue = settingsValue as KeybindSettingsValue | null;
  const { registrationStatus, registrationStatusLoadError } =
    useKeybindsSettingsRegistrationStatus();
  const { recorderStatus, recorderStatusState } =
    useKeybindsSettingsRecorderStatus();
  const editingDisabled = isKeybindEditingDisabled(
    recorderStatus,
    recorderStatusState,
  );
  const editingDisabledMessage = resolveKeybindEditingDisabledMessage(
    recorderStatus,
    recorderStatusState,
  );
  const {
    activeAction,
    activePreview,
    captureError,
    handleClearClick,
    handleRecordClick,
    handleResetClick,
  } = useKeybindsSettingsCapture({
    editingDisabled,
    keybindSettingsValue,
    updateSettings,
  });
  const visibleError = captureError ?? registrationStatusLoadError;

  return (
    <section className="col-span-12 rounded-box border border-base-content/10 bg-base-100/50 p-4">
      <div className="mb-3">
        <h2 className="m-0 font-semibold text-base">Keybinds</h2>
        <p className="m-0 text-base-content/55 text-sm">
          Global keyboard shortcuts work while Hinekora is in the background.
        </p>
      </div>

      <div
        className="mb-4 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-lg border border-info bg-secondary px-4 py-3 text-[0.8125rem] text-info leading-relaxed shadow-sm"
        role="status"
      >
        <FiInfo className="mt-0.5" size={18} />
        <span>{editingDisabledMessage ?? KEYBIND_EDITING_NOTICE}</span>
      </div>

      <div className="mb-2">
        <h3 className="m-0 font-semibold text-base-content/85 text-sm">
          Global
        </h3>
        <p className="m-0 text-base-content/50 text-xs">
          Registered with the OS and active while the app is in the background.
        </p>
      </div>

      <div className="divide-y divide-base-content/10 rounded-box border border-base-content/10 px-3">
        {keybindActions.map((action) => {
          const savedAccelerator = readSavedAccelerator(
            keybindSettingsValue,
            action,
          );

          return (
            <KeybindsSettingsRow
              action={action}
              activePreview={activePreview}
              isActive={activeAction === action}
              isDisabled={editingDisabled}
              key={action}
              registrationStatus={registrationStatus?.[action] ?? null}
              savedAccelerator={savedAccelerator}
              onClearClick={handleClearClick}
              onRecordClick={handleRecordClick}
              onResetClick={handleResetClick}
            />
          );
        })}
      </div>

      <InternalKeybindsSection />

      {visibleError && (
        <p className="m-0 mt-3 text-error text-sm" role="alert">
          {visibleError}
        </p>
      )}
    </section>
  );
}

export { KeybindsSettingsCard };
