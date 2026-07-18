import { ipcRenderer } from "electron";

import type { CapturePreviewSource } from "~/types";
import { CapturePreviewChannel } from "./CapturePreview.channels";

const CapturePreviewAPI = {
  getSourceThumbnail: (sourceId: string): Promise<string | null> =>
    ipcRenderer.invoke(CapturePreviewChannel.GetSourceThumbnail, sourceId),
  listSources: (forceRefresh?: boolean): Promise<CapturePreviewSource[]> =>
    ipcRenderer.invoke(CapturePreviewChannel.ListSources, forceRefresh),
  prepareDisplayMediaSource: (sourceId: string): Promise<boolean> =>
    ipcRenderer.invoke(
      CapturePreviewChannel.PrepareDisplayMediaSource,
      sourceId,
    ),
  reportFailure: (sourceId: string, error: string): void => {
    void ipcRenderer
      .invoke(CapturePreviewChannel.ReportFailure, sourceId, error)
      .catch(() => undefined);
  },
  onRefreshRequested: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on(CapturePreviewChannel.RefreshRequested, listener);

    return () =>
      ipcRenderer.removeListener(
        CapturePreviewChannel.RefreshRequested,
        listener,
      );
  },
};

export { CapturePreviewAPI };
