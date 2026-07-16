import type { ChangeEvent } from "react";
import { FiAlertTriangle } from "react-icons/fi";

import { useSettingsShallow } from "~/renderer/store";

import { HINEKORA_PRIVACY_POLICY_URL } from "~/types";
import { PseudonymousUserIdField } from "../PseudonymousUserIdField/PseudonymousUserIdField";
import { SettingsToggleRow } from "../SettingsToggleRow/SettingsToggleRow";

function PrivacySettingsCard() {
  const {
    crashReportingError,
    isSavingCrashReporting,
    settingsValue,
    updatePreference,
  } = useSettingsShallow((settings) => ({
    crashReportingError:
      settings.preferenceErrors.telemetryCrashReporting ?? null,
    isSavingCrashReporting:
      settings.pendingPreferences.telemetryCrashReporting === true,
    settingsValue: settings.value,
    updatePreference: settings.updatePreference,
  }));

  const handleCrashReportingChange = (event: ChangeEvent<HTMLInputElement>) => {
    void updatePreference("telemetryCrashReporting", event.target.checked);
  };

  return (
    <section className="col-span-12 space-y-3">
      <p className="sr-only">Privacy and telemetry settings</p>
      <div className="alert alert-soft alert-warning py-2 text-sm">
        <FiAlertTriangle className="h-4 w-4 shrink-0" />
        <span>Changes take effect after restarting the app.</span>
      </div>

      <div className="divide-y divide-base-content/10">
        <SettingsToggleRow
          ariaLabel="Crash Reporting"
          checked={settingsValue?.telemetryCrashReporting ?? true}
          description="Send error reports when something goes wrong. Reports can include your OS type, app version, and error details; usernames and local paths are redacted where possible."
          disabled={isSavingCrashReporting}
          label="Crash Reporting"
          statusClassName={
            crashReportingError ? "text-error" : "text-base-content/50"
          }
          statusLabel={
            crashReportingError ??
            (isSavingCrashReporting ? "Saving..." : undefined)
          }
          statusRole={crashReportingError ? "alert" : "status"}
          onChange={handleCrashReportingChange}
        />

        <PseudonymousUserIdField />

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-base-content/70 text-sm">Privacy Policy</span>
          <a
            className="btn btn-primary btn-xs gap-1"
            href={HINEKORA_PRIVACY_POLICY_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            View
          </a>
        </div>
      </div>
    </section>
  );
}

export { PrivacySettingsCard };
