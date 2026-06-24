import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppSettings, GameId } from "~/types";
import { createDefaultSettings } from "~/types";

const storeMocks = vi.hoisted(() => ({
  settingsValue: null as AppSettings | null,
  updateSettings: vi.fn(),
  useSettingsShallow: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useSettingsShallow: storeMocks.useSettingsShallow,
}));

import { LeagueSelect } from "./LeagueSelect";

let container: HTMLDivElement;
let root: Root;

function setSettings(settings: Partial<AppSettings>): void {
  storeMocks.settingsValue = {
    ...createDefaultSettings(),
    ...settings,
  };
}

async function renderLeagueSelect(game: GameId): Promise<void> {
  await act(async () => {
    root.render(<LeagueSelect game={game} />);
    await Promise.resolve();
  });
}

function getLeagueSelect(): HTMLSelectElement {
  const select = container.querySelector<HTMLSelectElement>("select");
  if (!select) {
    throw new Error("Expected league select to render");
  }

  return select;
}

function getOptionLabels(): string[] {
  return Array.from(getLeagueSelect().options).map((option) => option.label);
}

describe("LeagueSelect", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    setSettings({});
    storeMocks.updateSettings.mockReset();
    storeMocks.updateSettings.mockResolvedValue(undefined);
    storeMocks.useSettingsShallow.mockImplementation((selector) =>
      selector({
        value: storeMocks.settingsValue ?? createDefaultSettings(),
        update: storeMocks.updateSettings,
      }),
    );
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders current PoE 1 league options", async () => {
    await renderLeagueSelect("poe1");

    expect(getOptionLabels()).toEqual(["Standard", "Mirage"]);
  });

  it("renders current PoE 2 league options", async () => {
    await renderLeagueSelect("poe2");

    expect(getOptionLabels()).toEqual(["Standard", "Runes of Aldur"]);
  });

  it("normalizes stale saved leagues through settings", async () => {
    setSettings({
      activeGame: "poe2",
      poe2SelectedLeague: "Dawn of the Hunt",
    });

    await renderLeagueSelect("poe2");

    expect(getLeagueSelect().value).toBe("Standard");
    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      activeLeague: "Standard",
      poe2SelectedLeague: "Standard",
    });
  });

  it("persists league changes for the active game", async () => {
    setSettings({
      activeGame: "poe2",
      poe2SelectedLeague: "Standard",
    });
    await renderLeagueSelect("poe2");
    storeMocks.updateSettings.mockClear();

    await act(async () => {
      getLeagueSelect().value = "Runes of Aldur";
      getLeagueSelect().dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      activeLeague: "Runes of Aldur",
      poe2SelectedLeague: "Runes of Aldur",
    });
  });
});
