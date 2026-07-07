import type { ChangeEvent } from "react";
import { FiAlertTriangle } from "react-icons/fi";

import { useSettingsShallow } from "~/renderer/store";

import { SettingsToggleRow } from "../SettingsToggleRow/SettingsToggleRow";

const PRIVACY_POLICY_URL =
  "https://github.com/navali-creations/Hinekora/blob/master/PRIVACY.md";

function PrivacySettingsCard() {
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));

  const handleCrashReportingChange = (event: ChangeEvent<HTMLInputElement>) => {
    void updateSettings({ telemetryCrashReporting: event.target.checked });
  };

  const handleUsageAnalyticsChange = (event: ChangeEvent<HTMLInputElement>) => {
    void updateSettings({ telemetryUsageAnalytics: event.target.checked });
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
          checked={settingsValue?.telemetryCrashReporting ?? false}
          description="Send anonymous error reports when something goes wrong. Only your OS type, app version, and error details are included - no usernames or file paths."
          label="Crash Reporting"
          onChange={handleCrashReportingChange}
        />

        <SettingsToggleRow
          checked={settingsValue?.telemetryUsageAnalytics ?? false}
          description="Help us understand which features are used most. No personal data is collected."
          label="Usage Analytics"
          onChange={handleUsageAnalyticsChange}
        />

        <div className="flex items-center justify-between gap-4 py-3">
          <span className="text-base-content/70 text-sm">Privacy Policy</span>
          <a
            className="btn btn-primary btn-xs gap-1"
            href={PRIVACY_POLICY_URL}
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
