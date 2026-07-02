import { ipcRenderer } from "electron";

import type { AppSettings } from "~/types";
import { SettingsStoreChannel } from "./SettingsStore.channels";
import type { SettingsUpdateInput } from "./SettingsStore.dto";

const SettingsStoreAPI = {
  get: (): Promise<AppSettings> => ipcRenderer.invoke(SettingsStoreChannel.Get),
  onChanged: (callback: (settings: AppSettings) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      settings: AppSettings,
    ) => {
      callback(settings);
    };

    ipcRenderer.on(SettingsStoreChannel.Changed, listener);

    return () =>
      ipcRenderer.removeListener(SettingsStoreChannel.Changed, listener);
  },
  update: (input: SettingsUpdateInput): Promise<AppSettings> =>
    ipcRenderer.invoke(SettingsStoreChannel.Update, input),
};

export { SettingsStoreAPI };
