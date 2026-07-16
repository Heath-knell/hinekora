import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppSettings } from "~/types";

const storeMocks = vi.hoisted(() => ({
  catalogErrors: {} as Record<string, string>,
  isLoading: false,
  preferenceErrors: {} as Record<string, string>,
  updatePreference: vi.fn(),
  value: null as Partial<AppSettings> | null,
}));

vi.mock("~/renderer/store", async () => {
  const { createPoeLeagueFixtureCatalog: createPoeLeagueTestCatalog } =
    await import("~/types/test-fixtures/poe-leagues");

  return {
    usePoeLeaguesShallow: (selector: (value: unknown) => unknown) =>
      selector({
        byGame: createPoeLeagueTestCatalog(),
        errors: storeMocks.catalogErrors,
        isFetchingByGame: {
          poe1: storeMocks.isLoading,
          poe2: storeMocks.isLoading,
        },
      }),
    useSettingsShallow: (
      selector: (settings: {
        preferenceErrors: Record<string, string>;
        updatePreference: typeof storeMocks.updatePreference;
        value: Partial<AppSettings> | null;
      }) => unknown,
    ) => selector(storeMocks),
  };
});

import { useMediaLibraryScope } from "./useMediaLibraryScope";

function ScopeHarness() {
  const { error, isFetchingLeagues, scope, setLeague } = useMediaLibraryScope();

  const handleSelectAll = () => {
    setLeague("__all__");
  };

  return (
    <div>
      <output>{`${scope.game}:${scope.league}`}</output>
      {error ? <p role="status">{error}</p> : null}
      {isFetchingLeagues ? <p role="status">Fetching</p> : null}
      <button type="button" onClick={handleSelectAll}>
        All leagues
      </button>
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

describe("useMediaLibraryScope", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    storeMocks.catalogErrors = {};
    storeMocks.isLoading = false;
    storeMocks.preferenceErrors = {};
    storeMocks.updatePreference.mockImplementation(async (key, league) => {
      if (storeMocks.value) {
        storeMocks.value = { ...storeMocks.value, [key]: league };
      }
      return true;
    });
    storeMocks.value = {
      activeGame: "poe2",
      poe2MediaLibraryLeague: "Runes of Aldur",
      poe2SelectedLeague: "Standard",
    };
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("restores the persisted media league independently of the recording league", async () => {
    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("poe2:Runes of Aldur");
  });

  it("resolves an unset media preference to the catalog current league", async () => {
    storeMocks.value = {
      activeGame: "poe2",
      poe2MediaLibraryLeague: null,
      poe2SelectedLeague: "Standard",
    };

    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("poe2:Runes of Aldur");
  });

  it("persists all-leagues selection for the active game", async () => {
    await act(async () => {
      root.render(<ScopeHarness />);
    });

    await act(async () => {
      container.querySelector("button")?.click();
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("poe2:__all__");
    expect(storeMocks.updatePreference).toHaveBeenCalledWith(
      "poe2MediaLibraryLeague",
      "__all__",
    );
  });

  it("restores each game's persisted selection after switching from all leagues", async () => {
    await act(async () => {
      root.render(<ScopeHarness />);
    });

    await act(async () => {
      container.querySelector("button")?.click();
      root.render(<ScopeHarness />);
    });
    expect(container.textContent).toContain("poe2:__all__");

    storeMocks.value = {
      ...storeMocks.value,
      activeGame: "poe1",
      poe1MediaLibraryLeague: "Standard",
    };
    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("poe1:Standard");
  });

  it("shows centralized preference errors", async () => {
    storeMocks.preferenceErrors = {
      poe2MediaLibraryLeague: "Could not save this preference.",
    };

    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("Could not save this preference.");
  });

  it("shows catalog boundary errors for the active game", async () => {
    storeMocks.catalogErrors = { poe2: "League catalog is unavailable." };

    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("League catalog is unavailable.");
  });

  it("exposes catalog fetching state", async () => {
    storeMocks.isLoading = true;

    await act(async () => {
      root.render(<ScopeHarness />);
    });

    expect(container.textContent).toContain("Fetching");
  });
});
