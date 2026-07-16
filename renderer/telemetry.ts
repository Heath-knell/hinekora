import { initSentry } from "./sentry";

async function initTelemetry(): Promise<void> {
  if (!window.electron.settings?.get) {
    return;
  }

  try {
    const settings = await window.electron.settings.get();
    initSentry(settings.telemetryCrashReporting === true);
  } catch (error) {
    console.warn(
      "[Renderer] Could not load telemetry settings, skipping telemetry init:",
      error,
    );
  }
}

export { initTelemetry };
