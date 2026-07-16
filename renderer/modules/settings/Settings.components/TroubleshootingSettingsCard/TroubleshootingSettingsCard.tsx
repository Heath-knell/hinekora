import { type ChangeEvent, useCallback, useState } from "react";
import { FiFileText, FiTerminal } from "react-icons/fi";

import { useSettingsShallow } from "~/renderer/store";

type DiagnosticLogStatus = "idle" | "opening" | "error";
type DevToolsStatus = "idle" | "opening" | "error";

function TroubleshootingSettingsCard() {
  const [diagnosticLogStatus, setDiagnosticLogStatus] =
    useState<DiagnosticLogStatus>("idle");
  const [devToolsStatus, setDevToolsStatus] = useState<DevToolsStatus>("idle");
  const isOpeningDiagnosticLog = diagnosticLogStatus === "opening";
  const isOpeningDevTools = devToolsStatus === "opening";
  const {
    editorLogError,
    isEditorLogEnabled,
    isSavingEditorLog,
    updatePreference,
  } = useSettingsShallow((settings) => ({
    editorLogError: settings.preferenceErrors.editorLogEnabled ?? null,
    isEditorLogEnabled: settings.value?.editorLogEnabled ?? false,
    isSavingEditorLog: settings.pendingPreferences.editorLogEnabled === true,
    updatePreference: settings.updatePreference,
  }));

  const handleOpenDiagnosticLog = useCallback(async () => {
    setDiagnosticLogStatus("opening");

    try {
      const result = await window.electron.diagLog.revealLogFile();
      setDiagnosticLogStatus(result.success ? "idle" : "error");
    } catch {
      setDiagnosticLogStatus("error");
    }
  }, []);

  const handleOpenDevTools = useCallback(async () => {
    setDevToolsStatus("opening");

    try {
      await window.electron.mainWindow.openDevTools();
      setDevToolsStatus("idle");
    } catch {
      setDevToolsStatus("error");
    }
  }, []);

  const handleEditorLogChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    await updatePreference("editorLogEnabled", event.target.checked);
  };

  return (
    <section className="col-span-12 space-y-3">
      <p className="sr-only">Troubleshooting settings</p>

      <div className="divide-y divide-base-content/10">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 [text-wrap:wrap]">
            <h2 className="m-0 font-bold text-base-content text-sm">
              Diagnostic Log
            </h2>
            <p className="mt-1 mb-0 text-base-content/60 text-sm">
              View startup, recording, and crash diagnostics. The log is cleared
              on each app launch.
            </p>
            {diagnosticLogStatus === "error" ? (
              <p className="mt-2 mb-0 text-error text-xs" role="status">
                Could not open diagnostic log.
              </p>
            ) : null}
          </div>
          <button
            className="btn btn-primary btn-sm shrink-0 gap-2"
            disabled={isOpeningDiagnosticLog}
            type="button"
            onClick={handleOpenDiagnosticLog}
          >
            <FiFileText size={15} />
            {isOpeningDiagnosticLog ? "Opening..." : "Open log file"}
          </button>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
          <span className="min-w-0 [text-wrap:wrap]">
            <span className="block font-bold text-base-content text-sm">
              Editor log
            </span>
            <span className="mt-1 block text-base-content/60 text-sm">
              Show the editor Debug action for copying workspace state when
              diagnosing editor issues.
            </span>
            {editorLogError && (
              <span className="mt-2 block text-error text-xs" role="status">
                {editorLogError}
              </span>
            )}
          </span>
          <input
            aria-label="Editor log"
            checked={isEditorLogEnabled}
            className="toggle toggle-primary toggle-sm shrink-0"
            disabled={isSavingEditorLog}
            type="checkbox"
            onChange={handleEditorLogChange}
          />
        </label>

        <div className="flex items-center justify-between gap-4 py-3">
          <div className="min-w-0 [text-wrap:wrap]">
            <h2 className="m-0 font-bold text-base-content text-sm">
              Developer Tools
            </h2>
            <p className="mt-1 mb-0 text-base-content/60 text-sm">
              Open the app inspector for checking renderer logs and UI state.
            </p>
            {devToolsStatus === "error" ? (
              <p className="mt-2 mb-0 text-error text-xs" role="status">
                Could not open developer tools.
              </p>
            ) : null}
          </div>
          <button
            className="btn btn-secondary btn-sm shrink-0 gap-2"
            disabled={isOpeningDevTools}
            type="button"
            onClick={handleOpenDevTools}
          >
            <FiTerminal size={15} />
            {isOpeningDevTools ? "Opening..." : "Open DevTools"}
          </button>
        </div>
      </div>
    </section>
  );
}

export { TroubleshootingSettingsCard };
