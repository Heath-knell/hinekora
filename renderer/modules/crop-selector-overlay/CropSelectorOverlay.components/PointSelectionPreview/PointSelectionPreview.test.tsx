import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { PointSelectionPreview } from "./PointSelectionPreview";

describe("PointSelectionPreview", () => {
  let root: Root | null = null;

  afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
  });

  it("draws connected point and hover guide lines", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <PointSelectionPreview
          hoverPoint={{ x: 70, y: 90 }}
          points={[
            { x: 10, y: 20 },
            { x: 40, y: 50 },
          ]}
        />,
      );
    });

    const path = container.querySelector("path");
    const line = container.querySelector("line");

    expect(path?.getAttribute("d")).toBe("M 10 20 L 40 50");
    expect(line?.getAttribute("x1")).toBe("40");
    expect(line?.getAttribute("y1")).toBe("50");
    expect(line?.getAttribute("x2")).toBe("70");
    expect(line?.getAttribute("y2")).toBe("90");
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("2");
  });

  it("does not render before the first point is selected", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(<PointSelectionPreview hoverPoint={null} points={[]} />);
    });

    expect(container.querySelector("svg")).toBeNull();
  });
});
