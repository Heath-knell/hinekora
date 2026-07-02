import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  isProfileUnlocked: true,
  isRewindActive: false,
  isRunRecordingActive: false,
  isStartingRecording: false,
  isStoppingRecording: false,
  overlayCaptureProtectionEnabled: false,
  selectedProfileId: "capture-profile-1" as string | null,
  settingKey: "recordingHideOverlaysFromRecording" as
    | "recordingHideOverlaysFromRecording"
    | "recordingHideOverlaysFromRewind",
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

import { ManagedRecorderOverlayCaptureToggle } from "./ManagedRecorderOverlayCaptureToggle";

let container: HTMLDivElement;
let root: Root;

async function renderToggle(): Promise<void> {
  await act(async () => {
    root.render(
      <ManagedRecorderOverlayCaptureToggle
        ariaLabel="Hide Hinekora overlays from recording"
        helpText="Uses window capture protection so Hinekora overlays stay out of recordings."
        label="Hide overlays from recording"
        settingKey={storeMocks.settingKey}
      />,
    );
  });
}

function getCheckbox(): HTMLInputElement {
  const checkbox = container.querySelector<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  if (!checkbox) {
    throw new Error("Expected overlay capture checkbox to render");
  }

  return checkbox;
}

describe("ManagedRecorderOverlayCaptureToggle", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.isProfileUnlocked = true;
    storeMocks.isRewindActive = false;
    storeMocks.isRunRecordingActive = false;
    storeMocks.isStartingRecording = false;
    storeMocks.isStoppingRecording = false;
    storeMocks.overlayCaptureProtectionEnabled = false;
    storeMocks.selectedProfileId = "capture-profile-1";
    storeMocks.settingKey = "recordingHideOverlaysFromRecording";
    storeMocks.updateSettings.mockReset();
    storeMocks.updateSettings.mockResolvedValue(undefined);
    storeMocks.useSettingsShallow.mockImplementation((selector) =>
      selector({
        value: {
          [storeMocks.settingKey]: storeMocks.overlayCaptureProtectionEnabled,
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

  it("renders the saved overlay capture protection state", async () => {
    storeMocks.overlayCaptureProtectionEnabled = true;

    await renderToggle();

    expect(container.textContent).toContain("Hide overlays from recording");
    expect(getCheckbox().checked).toBe(true);
    expect(getCheckbox().classList.contains("toggle-xs")).toBe(true);
  });

  it("updates overlay capture protection when toggled", async () => {
    await renderToggle();

    await act(async () => {
      getCheckbox().click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingHideOverlaysFromRecording: true,
    });
  });

  it("updates rewind overlay capture protection when configured for rewind", async () => {
    storeMocks.settingKey = "recordingHideOverlaysFromRewind";

    await renderToggle();

    await act(async () => {
      getCheckbox().click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recordingHideOverlaysFromRewind: true,
    });
  });

  it("does not update while the selected profile is locked", async () => {
    storeMocks.isProfileUnlocked = false;

    await renderToggle();

    expect(getCheckbox().disabled).toBe(true);

    await act(async () => {
      getCheckbox().click();
    });

    expect(storeMocks.updateSettings).not.toHaveBeenCalled();
  });
});
