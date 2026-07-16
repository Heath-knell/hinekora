import type { ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storeMocks = vi.hoisted(() => ({
  clearSelectedClips: vi.fn(),
  preferenceError: null as string | null,
  persistedClipKind: "manual" as "death" | "manual",
  updatePreference: vi.fn(),
}));

vi.mock("~/renderer/store", () => ({
  useReplayClipsShallow: (selector: (replayClips: unknown) => unknown) =>
    selector({
      clearSelectedClips: storeMocks.clearSelectedClips,
      deleteSelectedClips: vi.fn(),
      libraryLeagues: [],
      selectedClipIds: {},
    }),
  useSettingsShallow: (selector: (settings: unknown) => unknown) =>
    selector({
      preferenceErrors: {
        ...(storeMocks.preferenceError
          ? { clipsLibraryView: storeMocks.preferenceError }
          : {}),
      },
      updatePreference: storeMocks.updatePreference,
      value: { clipsLibraryView: storeMocks.persistedClipKind },
    }),
}));
vi.mock(
  "~/renderer/modules/media-library/MediaLibrary.hooks/useMediaLibraryScope/useMediaLibraryScope",
  () => ({
    useMediaLibraryScope: () => ({
      scope: { game: "poe2", league: "Runes of Aldur" },
      setLeague: vi.fn(),
    }),
  }),
);
vi.mock("~/renderer/components/PageContainer/PageContainer", () => ({
  PageContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("~/renderer/components/PageContent/PageContent", () => ({
  PageContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("~/renderer/components/PageHeader/PageHeader", () => ({
  PageHeader: ({ actions }: { actions: ReactNode }) => (
    <header>{actions}</header>
  ),
}));
vi.mock(
  "~/renderer/modules/media-library/MediaLibrary.components/MediaLibraryPageActions/MediaLibraryPageActions",
  () => ({
    MediaLibraryPageActions: ({
      leadingAction,
      leagueControl,
    }: {
      leadingAction: ReactNode;
      leagueControl: ReactNode;
    }) => (
      <div>
        {leadingAction}
        {leagueControl}
      </div>
    ),
  }),
);
vi.mock(
  "~/renderer/modules/replay-clips/ReplayClips.components/ReplayClipsPanel/ReplayClipsPanel",
  () => ({
    ReplayClipsPanel: ({ query }: { query: { kind: string } }) => (
      <output>{query.kind}</output>
    ),
  }),
);

import { ClipsLibraryPage } from "./ClipsLibraryPage";

let container: HTMLDivElement;
let root: Root;

describe("ClipsLibraryPage", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.persistedClipKind = "manual";
    storeMocks.preferenceError = null;
    storeMocks.updatePreference.mockResolvedValue(true);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("restores and persists the last clips view", async () => {
    await act(async () => {
      root.render(<ClipsLibraryPage />);
    });

    expect(container.querySelector("output")?.textContent).toBe("manual");
    expect(
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Manual Replays")
        ?.getAttribute("aria-selected"),
    ).toBe("true");

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Death Clips")
        ?.click();
    });

    expect(storeMocks.clearSelectedClips).toHaveBeenCalledTimes(1);
    expect(storeMocks.updatePreference).toHaveBeenCalledWith(
      "clipsLibraryView",
      "death",
    );
  });

  it("shows centralized preference errors", async () => {
    storeMocks.preferenceError = "Could not save this preference.";
    await act(async () => {
      root.render(<ClipsLibraryPage />);
    });

    expect(container.textContent).toContain("Could not save this preference.");
    expect(
      container.querySelector('[aria-label="Clip type"]')?.parentElement
        ?.textContent,
    ).toContain("Could not save this preference.");
    expect(
      container.querySelector('[aria-label="Library league"]')?.parentElement
        ?.textContent,
    ).not.toContain("Could not save this preference.");
  });
});
