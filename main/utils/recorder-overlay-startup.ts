import type { AppSettings } from "~/types";
import * as appLog from "./app-log";

interface RecorderOverlayStartupService {
  showRecorderOverlay: () => Promise<void>;
}

async function requestRecorderOverlayOnStartup(
  settings: Pick<AppSettings, "recorderOverlayShowOnStartup">,
  overlayWindows: RecorderOverlayStartupService,
): Promise<boolean> {
  if (!settings.recorderOverlayShowOnStartup) {
    appLog.logInfo("startup", "Recorder overlay startup request skipped");

    return false;
  }

  await overlayWindows.showRecorderOverlay();
  appLog.logInfo("startup", "Recorder overlay requested");

  return true;
}

export { requestRecorderOverlayOnStartup };
