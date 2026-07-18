import { describe, expect, it } from "vitest";

import { createDesktopPreviewVideoConstraints } from "./CapturePreviewPanel.utils";

describe("CapturePreviewPanel utils", () => {
  it("allows live preview streams above 1080p", () => {
    expect(createDesktopPreviewVideoConstraints()).toEqual({
      width: { max: 3840 },
      height: { max: 2160 },
      frameRate: { max: 30 },
    });
  });
});
