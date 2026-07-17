import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CaptureFormatComparisonView } from "./CaptureFormatComparisonView";

let container: HTMLDivElement;
let root: Root;

describe("CaptureFormatComparisonView", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
  });

  it("explains every encoder with simple tradeoffs before technical names", async () => {
    await act(async () => {
      root.render(<CaptureFormatComparisonView />);
    });

    const table = container.querySelector("table");
    expect(table?.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(container.textContent).toContain("Easy to share (H.264)");
    expect(container.textContent).toContain("About 30% smaller");
    expect(container.textContent).toContain("Hardware H.264");
    expect(container.textContent).toContain("Hardware H.265 / HEVC");
    expect(container.textContent).toContain("Hardware AV1");
    expect(container.textContent).toContain("Software H.264 (OBS x264)");
  });
});
