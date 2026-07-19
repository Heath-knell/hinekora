import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  closeProfileActionDialog: vi.fn(),
  createProfile: vi.fn(),
  deleteAllProfiles: vi.fn(),
  deleteProfile: vi.fn(),
  duplicateProfile: vi.fn(),
  profileActionDialog: null as
    | "create"
    | "edit"
    | "duplicate"
    | "delete-current"
    | "delete-all"
    | null,
  updateProfile: vi.fn(),
  useCropEditorShallow: vi.fn(),
  useProfilesShallow: vi.fn(),
  useSettingsSelector: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCropEditorShallow: storeMocks.useCropEditorShallow,
  useProfilesShallow: storeMocks.useProfilesShallow,
  useSettingsSelector: storeMocks.useSettingsSelector,
}));

import { AuraProfileActionDialog } from "./AuraProfileActionDialog";

const profile = {
  id: "profile-1",
  name: "Bossing",
  game: "poe1" as const,
  targetFps: 30,
  captureTarget: null,
  cropRegions: [],
  overlayPlacements: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
let profileItems = [profile];
let root: Root | null = null;

function getButton(name: string): HTMLButtonElement {
  const button = [...document.body.querySelectorAll("button")].find(
    (item) => item.textContent?.replace(/\s+/g, " ").trim() === name,
  );
  expect(button).toBeInstanceOf(HTMLButtonElement);

  return button as HTMLButtonElement;
}

async function renderDialog(): Promise<void> {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<AuraProfileActionDialog />);
    await Promise.resolve();
  });
}

describe("AuraProfileActionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileItems = [profile];
    storeMocks.profileActionDialog = null;
    storeMocks.createProfile.mockResolvedValue(undefined);
    storeMocks.deleteAllProfiles.mockResolvedValue(undefined);
    storeMocks.deleteProfile.mockResolvedValue(undefined);
    storeMocks.duplicateProfile.mockResolvedValue(undefined);
    storeMocks.updateProfile.mockResolvedValue(undefined);
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        closeProfileActionDialog: storeMocks.closeProfileActionDialog,
        profileActionDialog: storeMocks.profileActionDialog,
      }),
    );
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        create: storeMocks.createProfile,
        delete: storeMocks.deleteProfile,
        deleteAll: storeMocks.deleteAllProfiles,
        duplicate: storeMocks.duplicateProfile,
        items: profileItems,
        selectedProfileId: profile.id,
        update: storeMocks.updateProfile,
      }),
    );
    storeMocks.useSettingsSelector.mockImplementation((selector) =>
      selector({ value: { activeGame: "poe1" } }),
    );
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
    };
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    document.body.replaceChildren();
  });

  it("creates a blank profile from the new-profile dialog", async () => {
    storeMocks.profileActionDialog = "create";
    await renderDialog();

    expect(document.body.textContent).toContain("Create an empty aura profile");
    const gameSelect = document.body.querySelector<HTMLSelectElement>(
      "select:not([required])",
    );
    expect(gameSelect?.value).toBe("all");
    await act(async () => {
      if (gameSelect) {
        gameSelect.value = "poe2";
        gameSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await act(async () => {
      getButton("Add profile").click();
      await Promise.resolve();
    });

    expect(storeMocks.createProfile).toHaveBeenCalledWith(
      "New Aura Profile",
      "poe2",
    );
    expect(storeMocks.closeProfileActionDialog).toHaveBeenCalled();
  });

  it("renames the current profile", async () => {
    storeMocks.profileActionDialog = "edit";
    await renderDialog();

    const input =
      document.body.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input?.value).toBe(profile.name);
    expect(document.body.textContent).toContain("Game availability");
    const gameSelect = document.body.querySelector("select");
    await act(async () => {
      if (gameSelect) {
        gameSelect.value = "all";
        gameSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    await act(async () => {
      getButton("Save changes").click();
      await Promise.resolve();
    });

    expect(storeMocks.updateProfile).toHaveBeenCalledWith({
      id: profile.id,
      game: null,
      name: profile.name,
    });
  });

  it("duplicates an existing profile", async () => {
    storeMocks.profileActionDialog = "duplicate";
    await renderDialog();

    expect(document.body.textContent).toContain(
      "Choose a saved aura profile to copy into a new profile",
    );
    await act(async () => {
      getButton("Duplicate profile").click();
      await Promise.resolve();
    });

    expect(storeMocks.duplicateProfile).toHaveBeenCalledWith(
      profile.id,
      "Bossing Copy",
    );
  });

  it("requires confirmation before deleting the current profile", async () => {
    storeMocks.profileActionDialog = "delete-current";
    await renderDialog();

    expect(document.body.textContent).toContain("Delete current profile?");
    expect(document.body.textContent).toContain(profile.name);
    expect(document.body.textContent).toContain("is the final profile");
    expect(document.body.querySelector(".badge")?.textContent).toBe(
      profile.name,
    );
    expect(storeMocks.deleteProfile).not.toHaveBeenCalled();
    await act(async () => {
      getButton("Delete profile").click();
      await Promise.resolve();
    });

    expect(storeMocks.deleteProfile).toHaveBeenCalledWith(profile.id);
  });

  it("confirms deleting all profiles while retaining a global empty default", async () => {
    profileItems = [profile, { ...profile, id: "profile-2" }];
    storeMocks.profileActionDialog = "delete-all";
    await renderDialog();

    expect(document.body.textContent).toContain("Delete all profiles?");
    expect(document.body.textContent).toContain(
      "will remain as an empty default",
    );
    expect(document.body.textContent).toContain("available to both games");
    await act(async () => {
      getButton("Delete all profiles").click();
      await Promise.resolve();
    });

    expect(storeMocks.deleteAllProfiles).toHaveBeenCalledWith(profile.id);
  });

  it("keeps an in-flight dialog open on escape and displays failures", async () => {
    let rejectCreate!: (error: Error) => void;
    storeMocks.createProfile.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectCreate = reject;
      }),
    );
    storeMocks.profileActionDialog = "create";
    await renderDialog();

    await act(async () => {
      getButton("Add profile").click();
      await Promise.resolve();
    });
    const cancelEvent = new Event("cancel", {
      bubbles: true,
      cancelable: true,
    });
    act(() =>
      document.body.querySelector("dialog")?.dispatchEvent(cancelEvent),
    );
    expect(cancelEvent.defaultPrevented).toBe(true);

    await act(async () => {
      rejectCreate(new Error("Create failed"));
      await Promise.resolve();
    });

    expect(document.body.querySelector('[role="alert"]')?.textContent).toBe(
      "Create failed",
    );
    expect(storeMocks.closeProfileActionDialog).not.toHaveBeenCalled();
  });
});
