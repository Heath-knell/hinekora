import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  autoStartMode: "off",
  hideOverlaysFromRecording: true,
  isProfileUnlocked: true,
  isRewindActive: false,
  isRunRecordingActive: false,
  isStartingRecording: false,
  isStoppingRecording: false,
  selectedProfileId: "capture-profile-1" as string | null,
  updateSettings: vi.fn(),
  useSettingsShallow: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
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
  useSettingsShallow: storeMocks.useSettingsShallow,
}));

import { ManagedRecorderRecordingSettingsFields } from "./ManagedRecorderRecordingSettingsFields";

let container: HTMLDivElement;
let root: Root;

async function renderFields(): Promise<void> {
  await act(async () => {
    root.render(<ManagedRecorderRecordingSettingsFields />);
  });
}

function getCheckbox(ariaLabel: string): HTMLInputElement {
  const checkbox = container.querySelector<HTMLInputElement>(
    `input[aria-label="${ariaLabel}"]`,
  );
  if (!checkbox) {
    throw new Error(`Expected ${ariaLabel} checkbox to render`);
  }

  return checkbox;
}

describe("ManagedRecorderRecordingSettingsFields", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.autoStartMode = "off";
    storeMocks.hideOverlaysFromRecording = true;
    storeMocks.isProfileUnlocked = true;
    storeMocks.isRewindActive = false;
    storeMocks.isRunRecordingActive = false;
    storeMocks.isStartingRecording = false;
    storeMocks.isStoppingRecording = false;
    storeMocks.selectedProfileId = "capture-profile-1";
    storeMocks.updateSettings.mockReset();
    storeMocks.updateSettings.mockResolvedValue(undefined);
    storeMocks.useSettingsShallow.mockImplementation((selector) =>
      selector({
        value: {
          recordingAutoStartMode: storeMocks.autoStartMode,
          recordingHideOverlaysFromRecording:
            storeMocks.hideOverlaysFromRecording,
        },
        update: storeMocks.updateSettings,
      }),
    );
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders and updates recording overlay capture protection", async () => {
    await renderFields();

    expect(container.textContent).toContain("Hide overlays from recording");
    expect(getCheckbox("Hide Hinekora overlays from recording").checked).toBe(
      true,
    );

    await act(async () => {
      getCheckbox("Hide Hinekora overlays from recording").click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingHideOverlaysFromRecording: false,
    });
  });

  it("renders and updates recording auto-start", async () => {
    await renderFields();

    expect(container.textContent).toContain("Start recording automatically");
    expect(getCheckbox("Start recording automatically").checked).toBe(false);

    await act(async () => {
      getCheckbox("Start recording automatically").click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingAutoStartMode: "recording",
    });
  });

  it("disables active recording auto-start from the recording tab", async () => {
    storeMocks.autoStartMode = "recording";
    await renderFields();

    expect(getCheckbox("Start recording automatically").checked).toBe(true);

    await act(async () => {
      getCheckbox("Start recording automatically").click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingAutoStartMode: "off",
    });
  });

  it("disables recording settings while the selected profile is locked", async () => {
    storeMocks.isProfileUnlocked = false;

    await renderFields();

    expect(getCheckbox("Start recording automatically").disabled).toBe(true);
    expect(getCheckbox("Hide Hinekora overlays from recording").disabled).toBe(
      true,
    );

    await act(async () => {
      getCheckbox("Start recording automatically").click();
    });

    expect(storeMocks.updateSettings).not.toHaveBeenCalled();
  });

  it("disables recording settings while rewind is active", async () => {
    storeMocks.isRewindActive = true;

    await renderFields();

    expect(getCheckbox("Start recording automatically").disabled).toBe(true);
    expect(getCheckbox("Hide Hinekora overlays from recording").disabled).toBe(
      true,
    );
  });
});
