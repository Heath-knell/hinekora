import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  mediaFilter: "death-clip" as
    | "death-clip"
    | "manual-replay"
    | "recording"
    | "saved-edits",
  preferenceError: null as string | null,
  setMediaFilter: vi.fn(),
  updatePreference: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useEditorShallow: (selector: (editor: unknown) => unknown) =>
    selector({
      clipboardState: { status: "idle" },
      exportState: { status: "idle" },
      mediaFilter: storeMocks.mediaFilter,
      setMediaFilter: storeMocks.setMediaFilter,
    }),
  useSettingsShallow: (selector: (settings: unknown) => unknown) =>
    selector({
      preferenceErrors: {
        ...(storeMocks.preferenceError
          ? { editorMediaFilter: storeMocks.preferenceError }
          : {}),
      },
      updatePreference: storeMocks.updatePreference,
      value: {},
    }),
}));

import { EditorAssetRailFilter } from "./EditorAssetRailFilter";

let container: HTMLDivElement;
let root: Root;

describe("EditorAssetRailFilter", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.preferenceError = null;
    storeMocks.mediaFilter = "manual-replay";
    storeMocks.setMediaFilter.mockImplementation((filter) => {
      storeMocks.mediaFilter = filter;
    });
    storeMocks.updatePreference.mockResolvedValue(true);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("persists the selected My media option", async () => {
    await act(async () => {
      root.render(<EditorAssetRailFilter />);
    });

    const select = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Media type"]',
    );
    expect(select?.value).toBe("manual-replay");
    expect(storeMocks.setMediaFilter).not.toHaveBeenCalled();

    await act(async () => {
      if (!select) {
        throw new Error("Expected media type select");
      }
      select.value = "recording";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(storeMocks.setMediaFilter).toHaveBeenLastCalledWith("recording");
    expect(storeMocks.updatePreference).toHaveBeenCalledWith(
      "editorMediaFilter",
      "recording",
    );
  });

  it("shows centralized preference errors", async () => {
    storeMocks.preferenceError = "Could not save this preference.";
    await act(async () => {
      root.render(<EditorAssetRailFilter />);
    });

    expect(container.textContent).toContain("Could not save this preference.");
  });
});
