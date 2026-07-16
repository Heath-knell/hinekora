import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ALL_LEAGUES_VALUE } from "~/renderer/modules/media-library/MediaLibrary.utils/MediaLibrary.utils";

import { useMediaLibraryLeagueOptions } from "./useMediaLibraryLeagueOptions";

interface OptionsHarnessProps {
  savedLeagues?: readonly string[];
  selectedLeague?: string;
}

function OptionsHarness({
  savedLeagues = ["Legacy League", "Standard"],
  selectedLeague = "Legacy League",
}: OptionsHarnessProps) {
  const options = useMediaLibraryLeagueOptions({
    catalogLeagues: ["Runes of Aldur", "Standard"],
    game: "poe2",
    savedLeagues,
    selectedLeague,
  });

  return <output>{options.map((option) => option.value).join("|")}</output>;
}

let container: HTMLDivElement;
let root: Root;

describe("useMediaLibraryLeagueOptions", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("combines catalog, selected, and saved leagues", async () => {
    await act(async () => {
      root.render(<OptionsHarness />);
    });

    expect(container.textContent).toBe(
      `${ALL_LEAGUES_VALUE}|Runes of Aldur|Standard|Legacy League`,
    );
  });

  it("does not duplicate the all-leagues option when it is selected", async () => {
    await act(async () => {
      root.render(<OptionsHarness selectedLeague={ALL_LEAGUES_VALUE} />);
    });

    expect(container.textContent).toBe(
      `${ALL_LEAGUES_VALUE}|Runes of Aldur|Standard|Legacy League`,
    );
  });
});
