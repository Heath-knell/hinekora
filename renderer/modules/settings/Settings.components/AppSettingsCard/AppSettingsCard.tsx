import type { ChangeEvent } from "react";

import { useSettingsShallow } from "~/renderer/store";

import type { AppCloseBehavior } from "~/types";
import { SettingsToggleRow } from "../SettingsToggleRow/SettingsToggleRow";

function AppSettingsCard() {
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));

  const handleCloseBehaviorChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void updateSettings({
      appCloseBehavior: event.target.value as AppCloseBehavior,
    });
  };

  const handleLaunchOnStartupChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void updateSettings({ appLaunchOnStartup: event.target.checked });
  };

  const handleStartMinimizedChange = (event: ChangeEvent<HTMLInputElement>) => {
    void updateSettings({ appStartMinimized: event.target.checked });
  };

  return (
    <section className="col-span-12 space-y-3">
      <p className="sr-only">Application preferences</p>

      <div className="divide-y divide-base-content/10">
        <label className="flex items-center justify-between gap-4 py-3">
          <span className="font-semibold text-sm">When closing the window</span>
          <select
            className="select select-bordered select-sm w-48 max-w-full shrink-0"
            value={settingsValue?.appCloseBehavior ?? "exit"}
            onChange={handleCloseBehaviorChange}
          >
            <option value="exit">Exit Application</option>
            <option value="minimize-to-tray">Minimize to Tray</option>
          </select>
        </label>

        <SettingsToggleRow
          ariaLabel="Launch on startup"
          checked={settingsValue?.appLaunchOnStartup ?? false}
          label="Launch on startup"
          onChange={handleLaunchOnStartupChange}
        />

        <SettingsToggleRow
          ariaLabel="Start minimized"
          checked={settingsValue?.appStartMinimized ?? false}
          label="Start minimized"
          onChange={handleStartMinimizedChange}
        />
      </div>
    </section>
  );
}

export { AppSettingsCard };
