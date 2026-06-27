import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ArcSelectionPreview } from "./ArcSelectionPreview";

describe("ArcSelectionPreview", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("draws a hover guide from point A to the cursor", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ArcSelectionPreview
          arcEnd={null}
          arcStart={{ x: 10, y: 20 }}
          hoverPoint={{ x: 70, y: 90 }}
        />,
      );
    });

    const line = container.querySelector("line");

    expect(line?.getAttribute("x1")).toBe("10");
    expect(line?.getAttribute("y1")).toBe("20");
    expect(line?.getAttribute("x2")).toBe("70");
    expect(line?.getAttribute("y2")).toBe("90");
    expect(container.textContent).toContain("A");
  });

  it("draws the preview arc and boundary paths after A and B are selected", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <ArcSelectionPreview
          arcEnd={{ x: 100, y: 20 }}
          arcStart={{ x: 10, y: 20 }}
          hoverPoint={{ x: 55, y: 80 }}
        />,
      );
    });

    const paths = [...container.querySelectorAll("path")];

    expect(paths).toHaveLength(3);
    expect(paths[0]?.getAttribute("d")).toContain("M ");
    expect(paths[0]?.getAttribute("d")).toContain(" L ");
    expect(paths[1]?.getAttribute("d")).toContain("M ");
    expect(paths[2]?.getAttribute("d")).toContain("M ");
    expect(container.textContent).toContain("A");
    expect(container.textContent).toContain("B");
    expect(container.textContent).toContain("C");
  });
});
