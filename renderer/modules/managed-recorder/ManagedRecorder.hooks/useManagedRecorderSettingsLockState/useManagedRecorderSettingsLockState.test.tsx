import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useManagedRecorderSettingsLockState } from "./useManagedRecorderSettingsLockState";

const storeMocks = vi.hoisted(() => ({
  captureProfiles: {
    isProfileUnlocked: false,
    selectedProfileId: "capture-profile-1" as string | null,
    setProfileUnlocked: vi.fn(),
  },
  managedRecorder: {
    status: null as unknown,
  },
}));

vi.mock("~/renderer/store", () => ({
  useCaptureProfilesShallow: <T,>(
    selector: (captureProfiles: typeof storeMocks.captureProfiles) => T,
  ) => selector(storeMocks.captureProfiles),
  useManagedRecorderShallow: <T,>(
    selector: (managedRecorder: { status: unknown }) => T,
  ) => selector(storeMocks.managedRecorder),
}));

let container: HTMLDivElement;
let root: Root;

function LockStateProbe() {
  const state = useManagedRecorderSettingsLockState();

  return (
    <button type="button" onClick={state.unlockSettings}>
      {JSON.stringify({
        canUnlock: state.canUnlock,
        isLocked: state.isLocked,
        message: state.message,
        title: state.title,
      })}
    </button>
  );
}

async function renderProbe(): Promise<HTMLButtonElement> {
  await act(async () => {
    root.render(<LockStateProbe />);
  });

  return container.querySelector("button")!;
}

describe("useManagedRecorderSettingsLockState", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.captureProfiles.isProfileUnlocked = false;
    storeMocks.captureProfiles.selectedProfileId = "capture-profile-1";
    storeMocks.captureProfiles.setProfileUnlocked.mockReset();
    storeMocks.managedRecorder.status = null;
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("allows unlocking locked profile settings while recording is idle", async () => {
    const button = await renderProbe();

    expect(button.textContent).toContain('"canUnlock":true');
    expect(button.textContent).toContain(
      "This profile's settings are hidden to prevent accidental changes.",
    );

    await act(async () => {
      button.click();
    });

    expect(storeMocks.captureProfiles.setProfileUnlocked).toHaveBeenCalledWith(
      true,
    );
  });

  it("keeps settings locked and non-unlockable while recording is active", async () => {
    storeMocks.managedRecorder.status = { recording: true };
    const button = await renderProbe();

    expect(button.textContent).toContain('"canUnlock":false');
    expect(button.textContent).toContain(
      "Settings are locked during recording or rewind.",
    );

    await act(async () => {
      button.click();
    });

    expect(
      storeMocks.captureProfiles.setProfileUnlocked,
    ).not.toHaveBeenCalled();
  });

  it("returns an unlocked state without a selected locked profile", async () => {
    storeMocks.captureProfiles.selectedProfileId = null;
    const button = await renderProbe();

    expect(button.textContent).toContain('"isLocked":false');
    expect(button.textContent).toContain('"message":""');

    await act(async () => {
      button.click();
    });

    expect(
      storeMocks.captureProfiles.setProfileUnlocked,
    ).not.toHaveBeenCalled();
  });

  it("returns an unlocked state for an explicitly unlocked profile", async () => {
    storeMocks.captureProfiles.isProfileUnlocked = true;
    const button = await renderProbe();

    expect(button.textContent).toContain('"isLocked":false');

    await act(async () => {
      button.click();
    });

    expect(
      storeMocks.captureProfiles.setProfileUnlocked,
    ).not.toHaveBeenCalled();
  });
});
