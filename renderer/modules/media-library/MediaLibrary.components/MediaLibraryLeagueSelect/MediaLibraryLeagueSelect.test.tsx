import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaLibraryLeagueSelect } from "./MediaLibraryLeagueSelect";

let container: HTMLDivElement;
let root: Root;
let handleLeagueChange = vi.fn();

async function renderLeagueSelect() {
  await act(async () => {
    root.render(
      <MediaLibraryLeagueSelect
        ariaLabel="Library league"
        error="Could not fetch leagues"
        isFetchingLeagues={true}
        league="Standard"
        leagueOptions={[
          { label: "Standard", value: "Standard" },
          { label: "Runes of Aldur", value: "Runes of Aldur" },
        ]}
        selectClassName="select"
        statusPlacement="before"
        onLeagueChange={handleLeagueChange}
      />,
    );
  });
}

describe("MediaLibraryLeagueSelect", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    handleLeagueChange = vi.fn();
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it("renders league status and forwards selection changes", async () => {
    await renderLeagueSelect();

    expect(container.textContent).toContain("Could not fetch leagues");
    expect(container.textContent).toContain("Fetching");

    const select = container.querySelector("select");
    if (!(select instanceof HTMLSelectElement)) {
      throw new Error("Expected league select to render");
    }

    select.value = "Runes of Aldur";
    await act(async () => {
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(handleLeagueChange).toHaveBeenCalledWith("Runes of Aldur");
  });

  it("supports a disabled select without status text", async () => {
    await act(async () => {
      root.render(
        <MediaLibraryLeagueSelect
          ariaLabel="Editor media league"
          disabled={true}
          league="Standard"
          leagueOptions={[{ label: "Standard", value: "Standard" }]}
          selectClassName="select"
          onLeagueChange={handleLeagueChange}
        />,
      );
    });

    const select = container.querySelector("select");
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect((select as HTMLSelectElement | null)?.disabled).toBe(true);
    expect(container.textContent).not.toContain("Fetching");
  });
});
