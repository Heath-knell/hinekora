import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AppSettings, createDefaultSettings } from "~/types";

const storeMocks = vi.hoisted(() => ({
  settingsValue: null as AppSettings | null,
  updateSettings: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useSettingsShallow: (selector: unknown) =>
    (selector as (settings: unknown) => unknown)({
      value: storeMocks.settingsValue,
      update: storeMocks.updateSettings,
    }),
}));

import { OverlaySettingsCard } from "./OverlaySettingsCard";

let container: HTMLDivElement;
let root: Root;

async function renderOverlaySettings() {
  await act(async () => {
    root.render(<OverlaySettingsCard />);
  });
}

describe("OverlaySettingsCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.settingsValue = createDefaultSettings();
    storeMocks.updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("toggles overlay preferences through settings", async () => {
    await renderOverlaySettings();
    const recorderStartupToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show recording overlay at startup"]',
    );
    const auraEditingFrameToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Show aura overlay editing frame"]',
    );

    await act(async () => {
      if (!recorderStartupToggle || !auraEditingFrameToggle) {
        throw new Error("Expected overlay preference toggles to render");
      }

      recorderStartupToggle.click();
      auraEditingFrameToggle.click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      recorderOverlayShowOnStartup: false,
    });
    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      auraOverlayShowEditingFrame: false,
    });
  });
});
