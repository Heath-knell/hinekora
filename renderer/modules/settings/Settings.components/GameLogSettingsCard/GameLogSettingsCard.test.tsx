import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type AppSettings, createDefaultSettings } from "~/types";

const storeMocks = vi.hoisted(() => ({
  saveGamePath: vi.fn(),
  settingsValue: null as AppSettings | null,
  status: null as { lastError: string | null } | null,
  updateSettings: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useClientLogShallow: (selector: unknown) =>
    (selector as (clientLog: unknown) => unknown)({
      saveGamePath: storeMocks.saveGamePath,
      status: storeMocks.status,
    }),
  useSettingsShallow: (selector: unknown) =>
    (selector as (settings: unknown) => unknown)({
      value: storeMocks.settingsValue,
      update: storeMocks.updateSettings,
    }),
}));

import { GameLogSettingsCard } from "./GameLogSettingsCard";

let container: HTMLDivElement;
let root: Root;

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderGameLogSettings() {
  await act(async () => {
    root.render(<GameLogSettingsCard />);
  });
}

describe("GameLogSettingsCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.settingsValue = {
      ...createDefaultSettings(),
      poe1ClientTxtPath: "C:\\Games\\Path of Exile\\logs\\Client.txt",
      poe2ClientTxtPath: "C:\\Games\\Path of Exile 2\\logs\\Client.txt",
    };
    storeMocks.status = null;
    storeMocks.updateSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("shows optional character name inputs after Client.txt paths", async () => {
    await renderGameLogSettings();

    expect(container.textContent).toContain("Path of Exile 2 Client.txt");
    expect(container.textContent).toContain("Character names");
    expect(container.textContent).toContain(
      "Optional. This is mainly used for group play.",
    );
    expect(container.textContent).toContain(
      "Hinekora can ignore teammate death lines",
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Path of Exile 1 character name"]',
      )?.value,
    ).toBe("");
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Path of Exile 2 character name"]',
      )?.value,
    ).toBe("");
  });

  it("saves per-game character names through settings", async () => {
    await renderGameLogSettings();
    const poe1Input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Path of Exile 1 character name"]',
    );
    const poe2Input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Path of Exile 2 character name"]',
    );

    await act(async () => {
      if (!poe1Input || !poe2Input) {
        throw new Error("Expected character name inputs to render");
      }

      setInputValue(poe1Input, "Ailucannon");
      setInputValue(poe2Input, "Ailumonk");
    });

    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      poe1CharacterName: "Ailucannon",
    });
    expect(storeMocks.updateSettings).toHaveBeenCalledWith({
      poe2CharacterName: "Ailumonk",
    });
  });

  it("uses the shared path mask until the user reveals a Client.txt path", async () => {
    storeMocks.settingsValue = {
      ...createDefaultSettings(),
      poe1ClientTxtPath:
        "C:\\Users\\Łukasz\\Documents\\My Games\\Path of Exile\\Client.txt",
    };

    await renderGameLogSettings();

    const input = container.querySelector<HTMLInputElement>("input[readonly]");
    expect(input?.value).toBe("C:\\**\\Path of Exile\\Client.txt");
    expect(input?.title).toBe("C:\\**\\Path of Exile\\Client.txt");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Reveal full path"]',
        )
        ?.click();
    });

    expect(input?.value).toBe(
      "C:\\Users\\Łukasz\\Documents\\My Games\\Path of Exile\\Client.txt",
    );
    expect(input?.title).toBe(
      "C:\\Users\\Łukasz\\Documents\\My Games\\Path of Exile\\Client.txt",
    );
  });
});
