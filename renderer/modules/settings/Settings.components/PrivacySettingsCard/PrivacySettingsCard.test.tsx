import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const settingsMocks = vi.hoisted(() => ({
  crashReporting: null as boolean | null,
  isSaving: false,
  preferenceError: null as string | null,
  updatePreference: vi.fn(),
}));
const leagueMocks = vi.hoisted(() => ({
  loadSessionUserId: vi.fn(),
  userId: "3f886c8b-18cf-4a48-8cdd-6a51cd44c6d5",
}));

vi.mock("~/renderer/store", () => ({
  usePoeLeaguesShallow: (selector: (poeLeagues: unknown) => unknown) =>
    selector({
      isFetchingByGame: { poe1: false, poe2: false },
      isSessionUserIdLoading: false,
      loadSessionUserId: leagueMocks.loadSessionUserId,
      previousSessionUserIds: [],
      sessionUserId: leagueMocks.userId,
      sessionUserIdError: null,
    }),
  useSettingsShallow: (selector: (settings: unknown) => unknown) =>
    selector({
      pendingPreferences: {
        ...(settingsMocks.isSaving ? { telemetryCrashReporting: true } : {}),
      },
      preferenceErrors: {
        ...(settingsMocks.preferenceError
          ? { telemetryCrashReporting: settingsMocks.preferenceError }
          : {}),
      },
      updatePreference: settingsMocks.updatePreference,
      value:
        settingsMocks.crashReporting === null
          ? null
          : { telemetryCrashReporting: settingsMocks.crashReporting },
    }),
}));

import { PrivacySettingsCard } from "./PrivacySettingsCard";

let container: HTMLDivElement;
let root: Root;

async function renderCard(): Promise<void> {
  await act(async () => {
    root.render(<PrivacySettingsCard />);
  });
}

describe("PrivacySettingsCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    settingsMocks.crashReporting = null;
    settingsMocks.isSaving = false;
    settingsMocks.preferenceError = null;
    leagueMocks.loadSessionUserId.mockResolvedValue(undefined);
    settingsMocks.updatePreference.mockResolvedValue(true);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("shows crash reporting as enabled while settings are loading", async () => {
    await renderCard();

    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Crash Reporting"]',
      )?.checked,
    ).toBe(true);
  });

  it("renders an explicit crash reporting opt-out", async () => {
    settingsMocks.crashReporting = false;

    await renderCard();

    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Crash Reporting"]',
      )?.checked,
    ).toBe(false);
  });

  it("persists crash reporting changes", async () => {
    settingsMocks.crashReporting = false;
    await renderCard();

    await act(async () => {
      container
        .querySelector<HTMLInputElement>('input[aria-label="Crash Reporting"]')
        ?.click();
    });

    expect(settingsMocks.updatePreference).toHaveBeenCalledWith(
      "telemetryCrashReporting",
      true,
    );
  });

  it("disables crash reporting changes while a save is pending", async () => {
    settingsMocks.isSaving = true;

    await renderCard();

    const toggle = container.querySelector<HTMLInputElement>(
      'input[aria-label="Crash Reporting"]',
    );
    expect(toggle?.disabled).toBe(true);
    expect(container.textContent).toContain("Saving...");
  });

  it("surfaces crash reporting persistence failures", async () => {
    settingsMocks.preferenceError = "Could not save this preference.";

    await renderCard();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Could not save this preference.",
    );
  });

  it("links to the published privacy policy", async () => {
    await renderCard();

    const link = container.querySelector<HTMLAnchorElement>("a");
    expect(link?.href).toContain(
      "github.com/navali-creations/hinekora/blob/master/PRIVACY.md",
    );
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
  });

  it("shows the masked pseudonymous session identity", async () => {
    await renderCard();

    const input = container.querySelector<HTMLInputElement>(
      'input[aria-label="Pseudonymous user ID"]',
    );
    expect(input?.type).toBe("password");
    expect(input?.value).toBe(leagueMocks.userId);
    expect(leagueMocks.loadSessionUserId).toHaveBeenCalledOnce();
  });
});
