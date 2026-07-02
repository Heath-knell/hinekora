import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BoundStore } from "~/renderer/store/store.types";

import type { CaptureProfile } from "~/types";
import { createCaptureProfileTestFixture as createProfile } from "../../CaptureProfiles.test-utils";
import { CaptureProfilesPanel } from "./CaptureProfilesPanel";

const storeMocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  deleteProfile: vi.fn(),
  isRecorderActive: false,
  items: [] as CaptureProfile[],
  selectedProfileId: "poe1" as string | null,
  selectProfileWithPreviewSource: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCaptureProfilesShallow: <T,>(
    selector: (captureProfiles: BoundStore["captureProfiles"]) => T,
  ) =>
    selector({
      create: storeMocks.createProfile,
      delete: storeMocks.deleteProfile,
      items: storeMocks.items,
      selectedProfileId: storeMocks.selectedProfileId,
      selectWithPreviewSource: storeMocks.selectProfileWithPreviewSource,
    } as unknown as BoundStore["captureProfiles"]),
  useManagedRecorderShallow: <T,>(
    selector: (managedRecorder: BoundStore["managedRecorder"]) => T,
  ) =>
    selector({
      status: storeMocks.isRecorderActive
        ? {
            recording: true,
          }
        : null,
    } as unknown as BoundStore["managedRecorder"]),
}));

let container: HTMLDivElement;
let root: Root;

async function renderPanel(): Promise<void> {
  await act(async () => {
    root.render(<CaptureProfilesPanel />);
  });
}

function getProfileNameInput(): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>(
    'input[aria-label="Capture profile name"]',
  );
  if (!input) {
    throw new Error("Expected capture profile name input to render");
  }

  return input;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  valueSetter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("CaptureProfilesPanel", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.createProfile.mockResolvedValue(undefined);
    storeMocks.deleteProfile.mockResolvedValue(undefined);
    storeMocks.items = [
      createProfile({
        id: "default-capture-poe1",
        isDefault: true,
        name: "Default PoE Capture",
      }),
      createProfile({
        game: "poe2",
        id: "default-capture-poe2",
        isDefault: true,
        name: "Default PoE 2 Capture",
      }),
      createProfile({
        game: "poe2",
        id: "poe2-bossing",
        name: "Bossing Capture",
      }),
    ];
    storeMocks.isRecorderActive = false;
    storeMocks.selectedProfileId = "default-capture-poe1";
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("creates a profile from the trimmed input name", async () => {
    await renderPanel();

    await act(async () => {
      const input = getProfileNameInput();
      setInputValue(input, "  Bossing Capture  ");
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.btn-primary")?.click();
    });

    expect(storeMocks.createProfile).toHaveBeenCalledWith("Bossing Capture");
  });

  it("selects and deletes visible profiles", async () => {
    await renderPanel();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[data-profile-id="poe2-bossing"]',
        )
        ?.click();
    });

    expect(storeMocks.selectProfileWithPreviewSource).toHaveBeenCalledWith(
      "poe2-bossing",
    );
    expect(container.textContent).toContain("Default PoE 1 Profile");
    expect(container.textContent).toContain("Default PoE 2 Profile");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Delete Bossing Capture"]',
        )
        ?.click();
    });

    expect(storeMocks.deleteProfile).toHaveBeenCalledWith("poe2-bossing");
  });

  it("disables deleting default profiles", async () => {
    await renderPanel();

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Delete Default PoE 1 Profile"]',
      )?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Delete Default PoE 2 Profile"]',
      )?.disabled,
    ).toBe(true);
  });

  it("disables deleting the last profile", async () => {
    storeMocks.items = [createProfile({ id: "poe1", name: "Bossing" })];
    await renderPanel();

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="Delete Bossing"]',
      )?.disabled,
    ).toBe(true);
  });

  it("disables profile creation, selection, and deletion while recording or rewind is active", async () => {
    storeMocks.isRecorderActive = true;
    await renderPanel();

    const nameInput = getProfileNameInput();
    const createButton =
      container.querySelector<HTMLButtonElement>("button.btn-primary");
    const profileButton = container.querySelector<HTMLButtonElement>(
      'button[data-profile-id="poe2-bossing"]',
    );
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Delete Bossing Capture"]',
    );

    expect(nameInput.disabled).toBe(true);
    expect(createButton?.disabled).toBe(true);
    expect(profileButton?.disabled).toBe(true);
    expect(deleteButton?.disabled).toBe(true);

    await act(async () => {
      createButton?.click();
      profileButton?.click();
      deleteButton?.click();
    });

    expect(storeMocks.createProfile).not.toHaveBeenCalled();
    expect(storeMocks.selectProfileWithPreviewSource).not.toHaveBeenCalled();
    expect(storeMocks.deleteProfile).not.toHaveBeenCalled();
  });

  it("shows the default recreation message when no profiles exist", async () => {
    storeMocks.items = [];
    await renderPanel();

    expect(container.textContent).toContain(
      "Default profile will be recreated automatically.",
    );
  });
});
