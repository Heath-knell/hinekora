import { ipcRenderer } from "electron";

import { unwrapIpcResult } from "~/main/utils/ipc-api";

import { MainWindowChannel } from "./MainWindow.channels";

const MainWindowAPI = {
  minimize: (): Promise<void> => ipcRenderer.invoke(MainWindowChannel.Minimize),
  maximize: (): Promise<boolean> =>
    ipcRenderer.invoke(MainWindowChannel.Maximize),
  unmaximize: (): Promise<boolean> =>
    ipcRenderer.invoke(MainWindowChannel.Unmaximize),
  isMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke(MainWindowChannel.IsMaximized),
  close: (): Promise<void> => ipcRenderer.invoke(MainWindowChannel.Close),
  openEditorClip: async (clipId: string): Promise<void> =>
    unwrapIpcResult(
      await ipcRenderer.invoke(MainWindowChannel.OpenEditorClip, clipId),
    ),
  openDevTools: (): Promise<void> =>
    ipcRenderer.invoke(MainWindowChannel.OpenDevTools),
};

export { MainWindowAPI };
