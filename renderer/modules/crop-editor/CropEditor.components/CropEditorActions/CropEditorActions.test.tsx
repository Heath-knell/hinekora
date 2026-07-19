import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  closeProfileActionDialog: vi.fn(),
  flushProfile: vi.fn(),
  openProfileActionDialog: vi.fn(),
  selectProfile: vi.fn(),
  useCropEditorShallow: vi.fn(),
  useProfilesShallow: vi.fn(),
  useSettingsSelector: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useCropEditorShallow: storeMocks.useCropEditorShallow,
  useProfilesShallow: storeMocks.useProfilesShallow,
  useSettingsSelector: storeMocks.useSettingsSelector,
}));

import { CropEditorActions } from "./CropEditorActions";

const profile = {
  id: "profile-1",
  name: "Default",
  game: "poe1" as const,
  targetFps: 30,
  captureTarget: null,
  cropRegions: [],
  overlayPlacements: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
let roots: Root[] = [];

function renderActions(): HTMLElement {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  act(() => root.render(<CropEditorActions />));

  return container;
}

function getButton(container: ParentNode, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.replace(/\s+/g, " ").trim().startsWith(name),
  );
  expect(button).toBeInstanceOf(HTMLButtonElement);

  return button as HTMLButtonElement;
}

describe("CropEditorActions", () => {
  beforeEach(() => {
    roots = [];
    vi.clearAllMocks();
    storeMocks.flushProfile.mockResolvedValue(undefined);
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        create: vi.fn(),
        delete: vi.fn(),
        deleteAll: vi.fn(),
        duplicate: vi.fn(),
        error: null,
        flush: storeMocks.flushProfile,
        items: [profile],
        select: storeMocks.selectProfile,
        selectedProfileId: profile.id,
        update: vi.fn(),
      }),
    );
    storeMocks.useCropEditorShallow.mockImplementation((selector) =>
      selector({
        closeProfileActionDialog: storeMocks.closeProfileActionDialog,
        openProfileActionDialog: storeMocks.openProfileActionDialog,
        profileActionDialog: null,
      }),
    );
    storeMocks.useSettingsSelector.mockImplementation((selector) =>
      selector({ value: { activeGame: "poe1" } }),
    );
  });

  afterEach(() => {
    for (const root of roots) {
      act(() => root.unmount());
    }
    document.body.replaceChildren();
  });

  it("renders profile actions instead of the add aura workflow", () => {
    const html = renderToStaticMarkup(<CropEditorActions />);

    expect(html).toContain("Profile actions");
    expect(html).toContain("Save changes");
    expect(html).toContain("Add new profile");
    expect(html).toContain("Edit current profile");
    expect(html).toContain("Duplicate profile");
    expect(html).toContain("Delete current profile");
    expect(html).toContain("Delete all profiles");
    expect(html).not.toContain("Add aura");
    expect(html).toContain("select-sm");
    expect(html).toContain("btn-sm");
  });

  it("selects another compatible aura profile", () => {
    const secondProfile = { ...profile, id: "profile-2", name: "Bossing" };
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        flush: storeMocks.flushProfile,
        error: null,
        items: [profile, secondProfile],
        select: storeMocks.selectProfile,
        selectedProfileId: profile.id,
      }),
    );
    const container = renderActions();
    const select = container.querySelector<HTMLSelectElement>(
      '[aria-label="Aura profile"]',
    );
    expect(select).toBeInstanceOf(HTMLSelectElement);

    act(() => {
      if (select) {
        select.value = secondProfile.id;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });

    expect(storeMocks.selectProfile).toHaveBeenCalledWith(secondProfile.id);
  });

  it("opens profile workflows from the menu", () => {
    const container = renderActions();

    act(() => getButton(container, "Add new profile").click());
    act(() => getButton(container, "Edit current profile").click());
    act(() => getButton(container, "Duplicate profile").click());
    act(() => getButton(container, "Delete current profile").click());
    act(() => getButton(container, "Delete all profiles").click());

    expect(storeMocks.openProfileActionDialog.mock.calls).toEqual([
      ["create"],
      ["edit"],
      ["duplicate"],
      ["delete-current"],
      ["delete-all"],
    ]);
  });

  it("dismisses profile actions on outside interaction and escape", () => {
    const container = renderActions();
    const details = container.querySelector("details");
    expect(details).toBeInstanceOf(HTMLDetailsElement);
    details?.setAttribute("open", "");

    act(() => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(details?.hasAttribute("open")).toBe(false);

    details?.setAttribute("open", "");
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }),
      );
    });
    expect(details?.hasAttribute("open")).toBe(false);
  });

  it("shows profile save failures in Aura Manager", () => {
    storeMocks.useProfilesShallow.mockImplementation((selector) =>
      selector({
        create: vi.fn(),
        delete: vi.fn(),
        deleteAll: vi.fn(),
        duplicate: vi.fn(),
        error: "Save failed",
        flush: storeMocks.flushProfile,
        items: [profile],
        select: storeMocks.selectProfile,
        selectedProfileId: profile.id,
        update: vi.fn(),
      }),
    );

    const container = renderActions();

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Save failed",
    );
  });

  it("supports profile keyboard shortcuts and explicit save", async () => {
    const container = renderActions();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "n" }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "e" }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "d" }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "s" }),
      );
    });
    await act(async () => Promise.resolve());
    act(() => getButton(container, "Save changes").click());
    await act(async () => Promise.resolve());

    expect(storeMocks.openProfileActionDialog.mock.calls).toEqual([
      ["create"],
      ["edit"],
      ["delete-current"],
    ]);
    expect(storeMocks.flushProfile).toHaveBeenCalledTimes(2);
    expect(storeMocks.flushProfile).toHaveBeenCalledWith(profile.id);
  });

  it("does not open profile dialogs from editing fields", () => {
    const container = renderActions();
    const select = container.querySelector('[aria-label="Aura profile"]');

    act(() => {
      select?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          ctrlKey: true,
          key: "n",
        }),
      );
    });

    expect(storeMocks.openProfileActionDialog).not.toHaveBeenCalled();
  });
});
