const path = require("node:path");

const { app, BrowserWindow, ipcMain } = require("electron");

const rendererUrl = process.env.HINEKORA_E2E_RENDERER_URL;
const preloadPath = process.env.HINEKORA_E2E_PRELOAD_PATH;

if (!rendererUrl || !preloadPath) {
  throw new Error("Native overlay Electron smoke environment is incomplete");
}

const recorderStatus = {
  activeSessionDirectory: null,
  available: true,
  bufferActive: false,
  encoder: "hardware_h264",
  error: null,
  fps: 60,
  gameRunning: true,
  initialized: true,
  isStartingRecording: false,
  isStoppingRecording: false,
  lastRecordingPath: null,
  outputDirectory: null,
  outputResolution: "native",
  recording: false,
  recordingStartedAt: null,
  runRecordingActive: false,
  runRecordingPath: null,
  runRecordingStartedAt: null,
  runtime: "packaged_obs",
  runtimePath: null,
};
const overlaySettings = {
  activeGame: "poe1",
  auraOverlayShowEditingFrame: true,
  deathClipSeconds: 30,
  replayClipPreviewResolution: "720p",
  selectedCaptureProfileId: null,
  selectedCaptureProfileIdsByGame: {},
  selectedProfileId: null,
  telemetryCrashReporting: false,
};

ipcMain.handle("settings-store:get-overlay-snapshot", () => overlaySettings);
ipcMain.handle("managed-recorder:get-capture-mode", () => "rewind");
ipcMain.handle("managed-recorder:get-status", () => recorderStatus);
ipcMain.handle("profiles:list", () => []);
ipcMain.handle("overlay-windows:get-recorder-mode", () => "expanded");

async function createRecorderOverlayWindow() {
  const window = new BrowserWindow({
    width: 216,
    height: 200,
    frame: false,
    transparent: true,
    resizable: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.resolve(preloadPath),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  await window.loadURL(`${rendererUrl}/#/recorder-overlay`);
}

app.whenReady().then(createRecorderOverlayWindow);

app.on("window-all-closed", () => {
  app.quit();
});
