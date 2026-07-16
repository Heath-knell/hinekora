import { ipcRenderer } from "electron";

import type { GameId } from "~/types";
import { PoeLeaguesChannel } from "./PoeLeagues.channels";
import type {
  PoeLeaguesChangedEvent,
  PoeLeaguesListResult,
  PoeLeaguesStatusResult,
  PoeLeaguesUserIdResult,
} from "./PoeLeagues.dto";

const PoeLeaguesAPI = {
  list: (game: GameId): Promise<PoeLeaguesListResult> =>
    ipcRenderer.invoke(PoeLeaguesChannel.List, game),
  status: (game: GameId): Promise<PoeLeaguesStatusResult> =>
    ipcRenderer.invoke(PoeLeaguesChannel.Status, game),
  userId: (): Promise<PoeLeaguesUserIdResult> =>
    ipcRenderer.invoke(PoeLeaguesChannel.UserId),
  onChanged: (
    callback: (event: PoeLeaguesChangedEvent) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      value: PoeLeaguesChangedEvent,
    ) => {
      callback(value);
    };

    ipcRenderer.on(PoeLeaguesChannel.Changed, listener);
    return () =>
      ipcRenderer.removeListener(PoeLeaguesChannel.Changed, listener);
  },
};

export { PoeLeaguesAPI };
