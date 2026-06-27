import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { OverlayExitNotice } from "./OverlayExitNotice";

describe("OverlayExitNotice", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("tells the user how to leave the active overlay", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<OverlayExitNotice overlayName="aura overlay" />);
    });

    expect(container.textContent).toContain("Press");
    expect(container.textContent).toContain("Esc");
    expect(container.textContent).toContain("aura overlay");
    expect(container.querySelector(".kbd")).toBeInstanceOf(HTMLElement);
  });
});
