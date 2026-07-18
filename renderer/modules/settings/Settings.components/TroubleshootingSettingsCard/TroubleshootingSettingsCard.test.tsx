import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settingsMocks = vi.hoisted(() => ({
  editorLogEnabled: false,
  preferenceError: null as string | null,
  update: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useSettingsShallow: (selector: (settings: unknown) => unknown) =>
    selector({
      preferenceErrors: {
        ...(settingsMocks.preferenceError
          ? { editorLogEnabled: settingsMocks.preferenceError }
          : {}),
      },
      updatePreference: settingsMocks.update,
      value: { editorLogEnabled: settingsMocks.editorLogEnabled },
    }),
}));

import { TroubleshootingSettingsCard } from "./TroubleshootingSettingsCard";

let container: HTMLDivElement;
let root: Root;
const revealLogFile = vi.fn();
const openDevTools = vi.fn();

function getButtonByText(label: string): HTMLButtonElement {
  const button = [
    ...container.querySelectorAll<HTMLButtonElement>("button"),
  ].find((candidate) => candidate.textContent?.includes(label));
  if (!button) {
    throw new Error(`Expected ${label} button to render`);
  }

  return button;
}

async function renderCard(): Promise<void> {
  await act(async () => {
    root.render(<TroubleshootingSettingsCard />);
  });
}

describe("TroubleshootingSettingsCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    settingsMocks.editorLogEnabled = false;
    settingsMocks.preferenceError = null;
    settingsMocks.update.mockResolvedValue(true);
    revealLogFile.mockResolvedValue({ success: true });
    openDevTools.mockResolvedValue(undefined);
    Object.defineProperty(window, "electron", {
      configurable: true,
      value: {
        diagLog: {
          revealLogFile,
        },
        mainWindow: {
          openDevTools,
        },
      },
    });
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("opens the diagnostic log through preload", async () => {
    await renderCard();
    const button = getButtonByText("Open log file");

    await act(async () => {
      button.click();
    });

    expect(container.textContent).toContain("Diagnostic Log");
    expect(revealLogFile).toHaveBeenCalledTimes(1);
  });

  it("shows a failure message when the diagnostic log cannot be opened", async () => {
    revealLogFile.mockResolvedValueOnce({
      success: false,
      error: "shell failed",
    });
    await renderCard();
    const button = getButtonByText("Open log file");

    await act(async () => {
      button.click();
    });

    expect(container.textContent).toContain("Could not open diagnostic log.");
    expect(revealLogFile).toHaveBeenCalledTimes(1);
  });

  it("opens developer tools through preload", async () => {
    await renderCard();
    const button = getButtonByText("Open DevTools");

    await act(async () => {
      button.click();
    });

    expect(container.textContent).toContain("Developer Tools");
    expect(openDevTools).toHaveBeenCalledTimes(1);
  });

  it("shows a failure message when developer tools cannot be opened", async () => {
    openDevTools.mockRejectedValueOnce(new Error("devtools failed"));
    await renderCard();
    const button = getButtonByText("Open DevTools");

    await act(async () => {
      button.click();
    });

    expect(container.textContent).toContain("Could not open developer tools.");
    expect(openDevTools).toHaveBeenCalledTimes(1);
  });

  it("persists the editor log toggle", async () => {
    await renderCard();
    const toggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Editor log"]',
    );

    await act(async () => {
      toggle?.click();
    });

    expect(settingsMocks.update).toHaveBeenCalledWith("editorLogEnabled", true);
  });

  it("reports when the editor log toggle cannot be saved", async () => {
    settingsMocks.update.mockResolvedValueOnce(false);
    await renderCard();

    await act(async () => {
      container
        .querySelector<HTMLInputElement>('input[aria-label="Editor log"]')
        ?.click();
    });

    settingsMocks.preferenceError = "Could not save this preference.";
    await renderCard();

    expect(container.textContent).toContain("Could not save this preference.");
  });
});
