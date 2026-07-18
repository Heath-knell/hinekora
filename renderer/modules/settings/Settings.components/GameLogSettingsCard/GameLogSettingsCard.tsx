import { type ChangeEvent, useState } from "react";
import {
  FiEye as Eye,
  FiEyeOff as EyeOff,
  FiFolder as FolderOpen,
  FiInfo as Info,
} from "react-icons/fi";

import { useClientLogShallow, useSettingsShallow } from "~/renderer/store";

import { type GameId, maskPath } from "~/types";

const clientLogFields: Array<{ game: GameId; label: string }> = [
  { game: "poe1", label: "Path of Exile 1 client log" },
  { game: "poe2", label: "Path of Exile 2 client log" },
];
const clientLogPathAnchors = ["Path of Exile", "Path of Exile 2"] as const;

function GameLogSettingsCard() {
  const { saveGamePath, status } = useClientLogShallow((clientLog) => ({
    saveGamePath: clientLog.saveGamePath,
    status: clientLog.status,
  }));
  const { settingsValue, updateSettings } = useSettingsShallow((settings) => ({
    settingsValue: settings.value,
    updateSettings: settings.update,
  }));
  const [revealedPaths, setRevealedPaths] = useState<
    Partial<Record<GameId, boolean>>
  >({});

  const paths: Record<GameId, string> = {
    poe1: settingsValue?.poe1ClientTxtPath ?? "",
    poe2: settingsValue?.poe2ClientTxtPath ?? "",
  };
  const characterNames: Record<GameId, string> = {
    poe1: settingsValue?.poe1CharacterName ?? "",
    poe2: settingsValue?.poe2CharacterName ?? "",
  };

  const togglePathReveal = (game: GameId) => {
    setRevealedPaths((current) => ({
      ...current,
      [game]: !current[game],
    }));
  };

  const handleBrowsePath = async (game: GameId) => {
    const filePath = await window.electron.app.selectPath({
      title: "Select Path of Exile client log",
      filters: [{ name: "Text Files", extensions: ["txt"] }],
      properties: ["openFile"],
    });

    if (filePath) {
      await saveGamePath(game, filePath);
    }
  };

  const handlePoe1CharacterNameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void updateSettings({
      poe1CharacterName: event.currentTarget.value,
    });
  };

  const handlePoe2CharacterNameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    void updateSettings({
      poe2CharacterName: event.currentTarget.value,
    });
  };

  return (
    <section className="grid max-w-xl gap-4">
      <p className="sr-only">
        Configure paths to your Path of Exile client logs
      </p>
      {clientLogFields.map((field) => {
        const path = paths[field.game];
        const isRevealed = revealedPaths[field.game] === true;
        const displayPath = isRevealed
          ? path
          : maskPath(path, clientLogPathAnchors);

        return (
          <div className="space-y-2" key={field.game}>
            <div>
              <h3 className="m-0 font-semibold text-base-content/80 text-sm">
                {field.label}
              </h3>
              <p className="m-0 text-base-content/50 text-xs">
                Client.txt or KakaoClient.txt location
              </p>
            </div>
            <div className="join w-full">
              <label className="input input-bordered input-sm join-item flex min-w-0 flex-1 items-center">
                <input
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder="No file selected"
                  readOnly
                  title={displayPath || undefined}
                  type="text"
                  value={displayPath}
                />
              </label>
              {path && (
                <button
                  aria-label={
                    isRevealed ? "Hide full path" : "Reveal full path"
                  }
                  aria-pressed={isRevealed}
                  className="btn btn-ghost btn-sm btn-square join-item text-base-content/50 hover:text-base-content/80"
                  title={isRevealed ? "Hide full path" : "Reveal full path"}
                  type="button"
                  onClick={() => togglePathReveal(field.game)}
                >
                  {isRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
              <button
                aria-label={`Select ${field.label}`}
                className="no-drag btn btn-primary btn-sm btn-square join-item"
                title={`Select ${field.label}`}
                type="button"
                onClick={() => handleBrowsePath(field.game)}
              >
                <FolderOpen size={16} />
              </button>
            </div>
          </div>
        );
      })}
      <div className="border-base-content/10 border-t" />
      <div className="grid gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="m-0 font-semibold text-base-content/80 text-sm">
              Character names
            </h3>
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-lg border border-info bg-secondary px-4 py-3 text-[0.8125rem] text-info leading-relaxed shadow-sm">
            <Info className="mt-0.5" size={16} />
            <p className="m-0">
              Optional. This is mainly used for group play. Add the character
              you are playing so Hinekora can ignore teammate death lines and
              only create death clips for your deaths.
            </p>
          </div>
        </div>

        <label className="form-control w-full gap-2">
          <span className="label py-0">
            <span className="label-text text-base-content/80 text-sm">
              Path of Exile 1 character
            </span>
          </span>
          <input
            aria-label="Path of Exile 1 character name"
            className="input input-bordered input-sm w-full"
            maxLength={80}
            placeholder="Optional character name"
            type="text"
            value={characterNames.poe1}
            onChange={handlePoe1CharacterNameChange}
          />
        </label>

        <label className="form-control w-full gap-2">
          <span className="label py-0">
            <span className="label-text text-base-content/80 text-sm">
              Path of Exile 2 character
            </span>
          </span>
          <input
            aria-label="Path of Exile 2 character name"
            className="input input-bordered input-sm w-full"
            maxLength={80}
            placeholder="Optional character name"
            type="text"
            value={characterNames.poe2}
            onChange={handlePoe2CharacterNameChange}
          />
        </label>
      </div>
      {status?.lastError && (
        <p className="m-0 text-error text-[0.8125rem]" role="alert">
          {status.lastError}
        </p>
      )}
    </section>
  );
}

export { GameLogSettingsCard };
