import type { AppSettings } from "~/types";

type SettingsStoreOverlaySnapshot = Partial<AppSettings> &
  Pick<
    AppSettings,
    | "activeGame"
    | "deathClipSeconds"
    | "selectedCaptureProfileId"
    | "selectedCaptureProfileIdsByGame"
    | "selectedProfileId"
    | "telemetryCrashReporting"
    | "telemetryUsageAnalytics"
  >;

export type SettingsUpdateInput = Partial<AppSettings>;
export type { SettingsStoreOverlaySnapshot };

export function createSettingsStoreOverlaySnapshot(
  settings: AppSettings,
): SettingsStoreOverlaySnapshot {
  return {
    activeGame: settings.activeGame,
    deathClipSeconds: settings.deathClipSeconds,
    selectedCaptureProfileId: settings.selectedCaptureProfileId,
    selectedCaptureProfileIdsByGame: settings.selectedCaptureProfileIdsByGame,
    selectedProfileId: settings.selectedProfileId,
    telemetryCrashReporting: settings.telemetryCrashReporting,
    telemetryUsageAnalytics: settings.telemetryUsageAnalytics,
  };
}
