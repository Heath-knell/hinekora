import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AppSettings, createDefaultSettings } from "~/types";

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  settingsValue: null as AppSettings | null,
  updateSettings: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => routerMocks.navigate,
}));

vi.mock("~/renderer/store", () => ({
  useSettingsShallow: (selector: unknown) =>
    (selector as (settings: unknown) => unknown)({
      value: storeMocks.settingsValue,
      update: storeMocks.updateSettings,
    }),
}));

import { GroupPlayDeathAlert } from "./GroupPlayDeathAlert";

let container: HTMLDivElement;
let root: Root;

async function renderGroupPlayDeathAlert() {
  await act(async () => {
    root.render(<GroupPlayDeathAlert />);
  });
}

describe("GroupPlayDeathAlert", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.settingsValue = {
      ...createDefaultSettings(),
      installedGames: ["poe1", "poe2"],
      poe1CharacterName: "",
      poe2CharacterName: "",
    };
    storeMocks.updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("opens Game settings and persists dismissal", async () => {
    await renderGroupPlayDeathAlert();

    expect(container.textContent).toContain("Playing in a group?");
    expect(container.textContent).toContain("Game Settings");
    expect(container.textContent).toContain("Dismiss");

    const gameSettingsButton = Array.from(
      container.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("Game Settings"));
    const dismissButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Dismiss group play death clip alert"]',
    );

    await act(async () => {
      gameSettingsButton?.click();
      dismissButton?.click();
    });

    expect(routerMocks.navigate).toHaveBeenCalledWith({
      to: "/settings",
      search: {
        tab: "game",
      },
    });
    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      groupPlayDeathAlertDismissed: true,
    });
  });

  it("stays hidden after dismissal or when installed game character names are set", async () => {
    storeMocks.settingsValue = {
      ...createDefaultSettings(),
      groupPlayDeathAlertDismissed: true,
    };

    await renderGroupPlayDeathAlert();

    expect(container.textContent).not.toContain("Playing in a group?");

    storeMocks.settingsValue = {
      ...createDefaultSettings(),
      installedGames: ["poe1", "poe2"],
      poe1CharacterName: "Ailucannon",
      poe2CharacterName: "Ailumonk",
    };

    await renderGroupPlayDeathAlert();

    expect(container.textContent).not.toContain("Playing in a group?");
  });
});
