import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  isProfileUnlocked: true,
  isRewindActive: false,
  isRunRecordingActive: false,
  isStartingRecording: false,
  isStoppingRecording: false,
  selectedProfileId: "capture-profile-1" as string | null,
  updateSettings: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCapturePreviewShallow: (selector: (state: unknown) => unknown) =>
    selector({
      selectedSourceId: "source-1",
      sources: [
        {
          height: 1080,
          id: "source-1",
          width: 1920,
        },
      ],
    }),
  useCaptureProfilesShallow: (selector: (state: unknown) => unknown) =>
    selector({
      isProfileUnlocked: storeMocks.isProfileUnlocked,
      selectedProfileId: storeMocks.selectedProfileId,
    }),
  useManagedRecorderShallow: (selector: (state: unknown) => unknown) =>
    selector({
      status: {
        bufferActive: storeMocks.isRewindActive,
        isStartingRecording: storeMocks.isStartingRecording,
        isStoppingRecording: storeMocks.isStoppingRecording,
        recording: storeMocks.isRunRecordingActive,
        runRecordingActive: storeMocks.isRunRecordingActive,
      },
    }),
  useSettingsShallow: (selector: (state: unknown) => unknown) =>
    selector({
      update: storeMocks.updateSettings,
      value: {
        recordingClipQuality: "high",
        recordingEncoder: "hardware_h264",
        recordingFps: 30,
        recordingOutputResolution: "native",
        recordingRunQuality: "moderate",
      },
    }),
}));

import { ManagedRecorderSettingsFields } from "./ManagedRecorderSettingsFields";

let container: HTMLDivElement;
let root: Root;

async function renderFields(): Promise<void> {
  await act(async () => {
    root.render(<ManagedRecorderSettingsFields />);
  });
}

function getSelects(): HTMLSelectElement[] {
  return Array.from(container.querySelectorAll("select"));
}

function getFpsButton(label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === label,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected ${label} button to render`);
  }

  return button;
}

describe("ManagedRecorderSettingsFields", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.isProfileUnlocked = true;
    storeMocks.isRewindActive = false;
    storeMocks.isRunRecordingActive = false;
    storeMocks.isStartingRecording = false;
    storeMocks.isStoppingRecording = false;
    storeMocks.selectedProfileId = "capture-profile-1";
    storeMocks.updateSettings.mockReset();
    storeMocks.updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("updates capture settings when the profile is unlocked and recorder is idle", async () => {
    await renderFields();

    await act(async () => {
      getFpsButton("60 FPS").click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingFps: 60,
    });
  });

  it("keeps capture settings enabled when no capture profile is selected", async () => {
    storeMocks.isProfileUnlocked = false;
    storeMocks.selectedProfileId = null;

    await renderFields();

    for (const select of getSelects()) {
      expect(select.disabled).toBe(false);
    }
    expect(getFpsButton("30 FPS").disabled).toBe(false);
    expect(getFpsButton("60 FPS").disabled).toBe(false);

    await act(async () => {
      getFpsButton("60 FPS").click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingFps: 60,
    });
  });

  it("disables capture settings while the selected profile is locked", async () => {
    storeMocks.isProfileUnlocked = false;

    await renderFields();

    for (const select of getSelects()) {
      expect(select.disabled).toBe(true);
    }
    expect(getFpsButton("30 FPS").disabled).toBe(true);
    expect(getFpsButton("60 FPS").disabled).toBe(true);

    await act(async () => {
      getFpsButton("60 FPS").click();
    });

    expect(storeMocks.updateSettings).not.toHaveBeenCalled();
  });

  it("disables capture settings while recording is active", async () => {
    storeMocks.isRunRecordingActive = true;

    await renderFields();

    for (const select of getSelects()) {
      expect(select.disabled).toBe(true);
    }
    expect(getFpsButton("30 FPS").disabled).toBe(true);
    expect(getFpsButton("60 FPS").disabled).toBe(true);
  });
});
