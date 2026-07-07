import type { ChangeEvent } from "react";

import { useSettingsShallow } from "~/renderer/store";

import { SettingsToggleRow } from "../SettingsToggleRow/SettingsToggleRow";

function OverlaySettingsCard() {
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));

  const handleRecorderOverlayStartupChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void updateSettings({
      recorderOverlayShowOnStartup: event.target.checked,
    });
  };

  const handleAuraEditingFrameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void updateSettings({
      auraOverlayShowEditingFrame: event.target.checked,
    });
  };

  return (
    <section className="col-span-12 space-y-3">
      <p className="sr-only">Overlay settings</p>

      <div className="divide-y divide-base-content/10">
        <SettingsToggleRow
          ariaLabel="Show recording overlay at startup"
          checked={settingsValue?.recorderOverlayShowOnStartup ?? true}
          description="Show the recording overlay automatically when Hinekora starts. You can still show or hide it from the app bar overlay button."
          label="Recording Overlay Startup"
          onChange={handleRecorderOverlayStartupChange}
        />

        <SettingsToggleRow
          ariaLabel="Show aura overlay editing frame"
          checked={settingsValue?.auraOverlayShowEditingFrame ?? true}
          description="Show the border and glow around the screen while the aura overlay is unlocked for editing."
          label="Aura Editing Frame"
          onChange={handleAuraEditingFrameChange}
        />
      </div>
    </section>
  );
}

export { OverlaySettingsCard };
