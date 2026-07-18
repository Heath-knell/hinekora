import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ManagedRecorderSettingsLockedOverlay } from "./ManagedRecorderSettingsLockedOverlay";

const hookMocks = vi.hoisted(() => ({
  state: {
    canUnlock: true,
    isLocked: true,
    message:
      "This profile's settings are hidden to prevent accidental changes.",
    title: "Settings locked",
    unlockSettings: vi.fn(),
  },
}));

vi.mock(
  "../../ManagedRecorder.hooks/useManagedRecorderSettingsLockState/useManagedRecorderSettingsLockState",
  () => ({
    useManagedRecorderSettingsLockState: () => hookMocks.state,
  }),
);

let container: HTMLDivElement;
let root: Root;

async function renderOverlay(): Promise<void> {
  await act(async () => {
    root.render(<ManagedRecorderSettingsLockedOverlay />);
  });
}

describe("ManagedRecorderSettingsLockedOverlay", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    hookMocks.state = {
      canUnlock: true,
      isLocked: true,
      message:
        "This profile's settings are hidden to prevent accidental changes.",
      title: "Settings locked",
      unlockSettings: vi.fn(),
    };
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("renders nothing when settings are unlocked", async () => {
    hookMocks.state = {
      ...hookMocks.state,
      isLocked: false,
    };

    await renderOverlay();

    expect(container.textContent).toBe("");
  });

  it("shows settings from the locked profile overlay", async () => {
    await renderOverlay();

    const button = container.querySelector<HTMLButtonElement>("button")!;

    expect(container.textContent).toContain("Settings locked");
    expect(button.disabled).toBe(false);
    expect(button.title).toBe("Show settings");
    expect(button.textContent).toBe("Show settings");

    await act(async () => {
      button.click();
    });

    expect(hookMocks.state.unlockSettings).toHaveBeenCalledTimes(1);
  });

  it("disables unlocking while recording or rewind is active", async () => {
    hookMocks.state = {
      ...hookMocks.state,
      canUnlock: false,
      message: "Settings are locked during recording or rewind.",
    };

    await renderOverlay();

    const button = container.querySelector<HTMLButtonElement>("button")!;

    expect(button.disabled).toBe(true);
    expect(button.title).toBe(
      "Stop recording or rewind before showing settings",
    );
    expect(container.textContent).toContain(
      "Settings are locked during recording or rewind.",
    );
  });
});
