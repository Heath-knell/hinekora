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

import { AppSettingsCard } from "./AppSettingsCard";

let container: HTMLDivElement;
let root: Root;

async function renderAppSettings() {
  await act(async () => {
    root.render(<AppSettingsCard />);
  });
}

describe("AppSettingsCard", () => {
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

  it("updates startup preferences through settings", async () => {
    await renderAppSettings();
    const launchOnStartupToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Launch on startup"]',
    );
    const startMinimizedToggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Start minimized"]',
    );

    await act(async () => {
      if (!launchOnStartupToggle || !startMinimizedToggle) {
        throw new Error("Expected app preference toggles to render");
      }

      launchOnStartupToggle.click();
      startMinimizedToggle.click();
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      appLaunchOnStartup: true,
    });
    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      appStartMinimized: true,
    });
  });
});
