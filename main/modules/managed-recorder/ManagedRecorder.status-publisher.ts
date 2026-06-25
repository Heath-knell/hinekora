import { BrowserWindow } from "electron";

import { ManagedRecorderChannel } from "./ManagedRecorder.channels";
import type {
  ManagedRecorderCaptureMode,
  ManagedRecorderStatus,
} from "./ManagedRecorder.dto";

function sendToRenderer(channel: ManagedRecorderChannel, data: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data);
    }
  }
}

export function publishManagedRecorderStatus(
  status: ManagedRecorderStatus,
): void {
  sendToRenderer(ManagedRecorderChannel.StatusChanged, status);
}

export function publishManagedRecorderCaptureMode(
  captureMode: ManagedRecorderCaptureMode,
): void {
  sendToRenderer(ManagedRecorderChannel.CaptureModeChanged, captureMode);
}
