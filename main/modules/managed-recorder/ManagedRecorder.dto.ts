import type { ManagedRecorderStatus } from "~/types";

export type ManagedReplayKind = "death" | "manual";
export type ManagedRecorderCaptureMode = "session" | "rewind";
export type ManagedRecorderAudioDeviceKind = "input" | "output";

export interface ManagedRecorderAudioDevice {
  id: string;
  label: string;
}

export interface ManagedRecorderAudioDevices {
  input: ManagedRecorderAudioDevice[];
  output: ManagedRecorderAudioDevice[];
}

export interface ManagedRecorderListAudioDevicesOptions {
  forceRefresh?: boolean;
}

export interface ManagedReplaySaveResult {
  ok: boolean;
  path: string | null;
  error: string | null;
}

export type { ManagedRecorderStatus };
