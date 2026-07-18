import { ipcRenderer } from "electron";

import { unwrapIpcResult } from "~/main/utils/ipc-api";

import { RecordingStorageChannel } from "./RecordingStorage.channels";
import type {
  RecordingStorageBatchFileActionResult,
  RecordingStorageFileActionResult,
  RecordingStorageUsage,
  RecordingStorageUsageSnapshot,
  RunRecordingDetail,
  RunRecordingLibraryPage,
  RunRecordingLibraryQuery,
} from "./RecordingStorage.dto";
import {
  RecordingStorageChangedIdsSchema,
  RecordingStorageUsageErrorSchema,
  RecordingStorageUsageSchema,
  RecordingStorageUsageSnapshotSchema,
} from "./RecordingStorage.dto";

const RecordingStorageAPI = {
  getRecording: (id: string): Promise<RunRecordingDetail | null> =>
    ipcRenderer
      .invoke(RecordingStorageChannel.GetRecording, id)
      .then(unwrapIpcResult),
  getUsage: (): Promise<RecordingStorageUsageSnapshot> =>
    ipcRenderer
      .invoke(RecordingStorageChannel.GetUsage)
      .then(unwrapIpcResult)
      .then((usage) => RecordingStorageUsageSnapshotSchema.parse(usage)),
  onUsageChanged: (
    callback: (usage: RecordingStorageUsage) => void,
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      usage: RecordingStorageUsage,
    ) => {
      const parsedUsage = RecordingStorageUsageSchema.safeParse(usage);
      if (parsedUsage.success) {
        callback(parsedUsage.data);
      }
    };

    ipcRenderer.on(RecordingStorageChannel.UsageChanged, listener);

    return () =>
      ipcRenderer.removeListener(
        RecordingStorageChannel.UsageChanged,
        listener,
      );
  },
  onUsageRefreshFailed: (callback: (error: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, error: unknown) => {
      const parsedError = RecordingStorageUsageErrorSchema.safeParse(error);
      if (parsedError.success) {
        callback(parsedError.data);
      }
    };

    ipcRenderer.on(RecordingStorageChannel.UsageRefreshFailed, listener);
    return () =>
      ipcRenderer.removeListener(
        RecordingStorageChannel.UsageRefreshFailed,
        listener,
      );
  },
  onRecordingsChanged: (callback: (ids: string[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ids: unknown) => {
      const parsedIds = RecordingStorageChangedIdsSchema.safeParse(ids);
      if (parsedIds.success) {
        callback(parsedIds.data);
      }
    };

    ipcRenderer.on(RecordingStorageChannel.RecordingsChanged, listener);
    return () =>
      ipcRenderer.removeListener(
        RecordingStorageChannel.RecordingsChanged,
        listener,
      );
  },
  listRecordingLibrary: (
    query?: RunRecordingLibraryQuery,
  ): Promise<RunRecordingLibraryPage> =>
    ipcRenderer
      .invoke(RecordingStorageChannel.ListRecordingLibrary, query)
      .then(unwrapIpcResult),
  openRecording: (path: string): Promise<RecordingStorageFileActionResult> =>
    ipcRenderer.invoke(RecordingStorageChannel.OpenRecording, path),
  revealRecording: (path: string): Promise<RecordingStorageFileActionResult> =>
    ipcRenderer.invoke(RecordingStorageChannel.RevealRecording, path),
  copyRecording: (path: string): Promise<RecordingStorageFileActionResult> =>
    ipcRenderer.invoke(RecordingStorageChannel.CopyRecording, path),
  deleteRecording: (path: string): Promise<RecordingStorageFileActionResult> =>
    ipcRenderer.invoke(RecordingStorageChannel.DeleteRecording, path),
  deleteManyRecordings: (
    paths: string[],
  ): Promise<RecordingStorageBatchFileActionResult> =>
    ipcRenderer.invoke(RecordingStorageChannel.DeleteManyRecordings, paths),
};

export { RecordingStorageAPI };
