import { useNavigate } from "@tanstack/react-router";
import {
  FiAlertCircle as AlertCircle,
  FiArrowRight as ArrowRight,
} from "react-icons/fi";

import { useSettingsShallow } from "~/renderer/store";

import type { GameId } from "~/types";

function GroupPlayDeathAlert() {
  const navigate = useNavigate();
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));

  if (!settingsValue || settingsValue.groupPlayDeathAlertDismissed) {
    return null;
  }

  const characterNames: Record<GameId, string> = {
    poe1: settingsValue.poe1CharacterName ?? "",
    poe2: settingsValue.poe2CharacterName ?? "",
  };
  const needsCharacterName = (settingsValue.installedGames ?? []).some(
    (game) => characterNames[game].trim().length === 0,
  );

  if (!needsCharacterName) {
    return null;
  }

  const handleOpenGameSettings = () => {
    void navigate({
      to: "/settings",
      search: {
        tab: "game",
      },
    });
  };

  const handleDismiss = () => {
    void updateSettings({
      groupPlayDeathAlertDismissed: true,
    });
  };

  return (
    <div
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-[0.8125rem] text-base-content leading-relaxed shadow-sm"
      role="status"
    >
      <AlertCircle className="mt-0.5 text-warning" size={18} />
      <div className="min-w-0">
        <p className="m-0 font-semibold">Playing in a group?</p>
        <p className="m-0 text-base-content/70">
          Add your character name so Hinekora can ignore teammate death lines
          and create death clips only for you.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="btn btn-warning btn-xs"
          type="button"
          onClick={handleOpenGameSettings}
        >
          Game Settings
          <ArrowRight size={14} />
        </button>
        <button
          aria-label="Dismiss group play death clip alert"
          className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content"
          title="Dismiss"
          type="button"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export { GroupPlayDeathAlert };
