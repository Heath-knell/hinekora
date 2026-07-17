import { ipcRenderer } from "electron";

import { unwrapIpcResult } from "~/main/utils/ipc-api";

import type {
  CaptureProfile,
  CaptureProfileCreateInput,
  CaptureProfileUpdateInput,
} from "~/types";
import { CaptureProfilesChannel } from "./CaptureProfiles.channels";

const CaptureProfilesAPI = {
  list: (): Promise<CaptureProfile[]> =>
    ipcRenderer.invoke(CaptureProfilesChannel.List),
  create: (input: CaptureProfileCreateInput): Promise<CaptureProfile> =>
    ipcRenderer
      .invoke(CaptureProfilesChannel.Create, input)
      .then(unwrapIpcResult),
  update: (input: CaptureProfileUpdateInput): Promise<CaptureProfile> =>
    ipcRenderer
      .invoke(CaptureProfilesChannel.Update, input)
      .then(unwrapIpcResult),
  delete: (id: string): Promise<void> =>
    ipcRenderer.invoke(CaptureProfilesChannel.Delete, id).then(unwrapIpcResult),
  onChanged: (callback: (profiles: CaptureProfile[]) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      profiles: CaptureProfile[],
    ) => {
      callback(profiles);
    };

    ipcRenderer.on(CaptureProfilesChannel.Changed, listener);

    return () =>
      ipcRenderer.removeListener(CaptureProfilesChannel.Changed, listener);
  },
};

export { CaptureProfilesAPI };
